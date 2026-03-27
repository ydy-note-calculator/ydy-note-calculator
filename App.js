import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, TextInput, StyleSheet, Platform, Linking, useWindowDimensions, KeyboardAvoidingView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GA_TRACKING_ID = 'G-FD2290G3VG';

const THEMES = {
  dark: { id: 'dark', icon: '🌙', bg: '#0f172a', card: '#1e293b', text: '#ffffff', textSecondary: '#94a3b8', border: '#334155', accent: '#a855f7' },
  light: { id: 'light', icon: '☀️', bg: '#f8fafc', card: '#ffffff', text: '#1e293b', textSecondary: '#64748b', border: '#e2e8f0', accent: '#a855f7' },
  ocean: { id: 'ocean', icon: '🌊', bg: '#082f49', card: '#0c4a6e', text: '#f0f9ff', textSecondary: '#bae6fd', border: '#0284c7', accent: '#0ea5e9' },
  hacker: { id: 'hacker', icon: '💻', bg: '#000000', card: '#052e16', text: '#4ade80', textSecondary: '#22c55e', border: '#166534', accent: '#a855f7' }
};

const IS_WIN = Platform.OS === 'web' && typeof window !== 'undefined' && /windows/i.test(window.navigator.userAgent.toLowerCase());
const TR_ICON = IS_WIN ? 'TR' : '🇹🇷';
const EN_ICON = IS_WIN ? 'EN' : '🇺🇸';

const TRANSLATIONS = {
  tr: {
    sysTitle: 'YDY', sysSub: 'Not Hesaplama Sistemi',
    levelSelect: 'KUR SEÇİMİ', term1: '1. DÖNEM NOTLARI', term2: '2. DÖNEM NOTLARI',
    quiz: 'QUIZ', vize: 'VİZE', writing: 'WRITING', sunum: 'SUNUM', kanaat: 'KANAAT', odev: 'ONLİNE ÖDEV', final: 'FİNAL', butunleme: 'BÜTÜNLEME',
    pass: 'Geçtiniz ✓', fail: 'Kaldınız ✗', 
    finalFail: 'Finale Kaldınız', butFail: 'Bütünlemeye Kaldınız',
    finalPass: 'Finalle Geçtiniz ✓', butPass: 'Bütünleme ile Geçtiniz ✓',
    neededFinal: 'Finalde gereken: ', neededBut: 'Bütünlemede gereken: ',
    impossible: '100 alsan da geçilemiyor!',
    average: 'ORTALAMA:', reset: 'Tüm Notları Sıfırla', share: 'WhatsApp ile Paylaş',
    feedbackTitle: 'ÖNERİ VE GERİ BİLDİRİM', nameLabel: 'AD SOYAD', namePlace: 'ADINIZI GİRİNİZ',
    msgPlace: 'ÖNERİ, SORU VE ŞİKAYETLERİNİZİ BURAYA YAZABİLİRSİNİZ (Max 100 Karakter)...',
    sendBtn: 'MESAJI GÖNDER', successMsg: 'Mesajınız başarıyla iletildi!',
    waMsg: 'YDY Not Hesaplama Sonucum', waLevel: 'Kur Seviyesi', waAvg: 'Güncel Ortalama', waFinalNote: 'Yıl Sonu Notu', waButNote: 'Büt. Sonu Notu', waStatus: 'Akademik Durum', waLink: 'Sistemi kullan:',
    levelSuffix: 'KURU',
    metaDesc: 'YDY Not Hesaplama Sistemi. Üniversite hazırlık öğrencileri için vize, final ve bütünleme ortalama hesaplama aracı.',
    metaKeys: 'ydy not hesaplama, hazırlık atlama, vize final hesaplama, ydy'
  },
  en: {
    sysTitle: 'SFL', sysSub: 'Grade Calculator',
    levelSelect: 'SELECT LEVEL', term1: 'TERM 1 GRADES', term2: 'TERM 2 GRADES',
    quiz: 'QUIZ', vize: 'MIDTERM', writing: 'WRITING', sunum: 'PRESENTATION', kanaat: 'PARTICIPATION', odev: 'ONLINE ASSIGN.', final: 'FINAL', butunleme: 'MAKE-UP',
    pass: 'Passed ✓', fail: 'Failed ✗', 
    finalFail: 'Must Take Final', butFail: 'Must Take Make-up',
    finalPass: 'Passed via Final ✓', butPass: 'Passed via Make-up ✓',
    neededFinal: 'Needed in Final: ', neededBut: 'Needed in Make-up: ',
    impossible: 'Cannot pass even with 100!',
    average: 'AVERAGE:', reset: 'Reset All Grades', share: 'Share on WhatsApp',
    feedbackTitle: 'FEEDBACK & SUGGESTIONS', nameLabel: 'FULL NAME', namePlace: 'ENTER YOUR NAME',
    msgPlace: 'WRITE YOUR SUGGESTIONS OR COMPLAINTS HERE (Max 100 Chars)...',
    sendBtn: 'SEND MESSAGE', successMsg: 'Message sent successfully!',
    waMsg: 'SFL Grade Calculator Result', waLevel: 'Level', waAvg: 'Current Average', waFinalNote: 'End of Year Grade', waButNote: 'Make-up Final Grade', waStatus: 'Academic Status', waLink: 'Use the system:',
    levelSuffix: 'LEVEL',
    metaDesc: 'SFL Grade Calculator. Midterm, final and make-up average calculation tool for university prep students.',
    metaKeys: 'sfl grade calculator, proficiency exam, midterm final calculation'
  }
};

export default function App() {
  const { width } = useWindowDimensions();
  const isMobile = width < 600; 

  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTheme, setActiveTheme] = useState('hacker'); 
  const [language, setLanguage] = useState('tr');
  const [studentName, setStudentName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('A');
  const [grades, setGrades] = useState({
    quiz: ['', '', '', ''], vize: ['', '', '', ''],
    writing: ['', ''], sunum: ['', ''], kanaat: ['', ''], odev: ['', ''], 
    final: '', butunleme: ''
  });

  const [results, setResults] = useState(null);
  const [targetNote, setTargetNote] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');

  const debounceCalcTimer = React.useRef(null);
  const debounceSaveTimer = React.useRef(null);
  const gaReportingTimer = React.useRef(null);
  const gaIndividualTimer = React.useRef(null);

  const theme = THEMES[activeTheme] || THEMES.hacker;
  const t = TRANSLATIONS[language];

  useEffect(() => {
    return () => {
      if (debounceCalcTimer.current) clearTimeout(debounceCalcTimer.current);
      if (debounceSaveTimer.current) clearTimeout(debounceSaveTimer.current);
      if (gaReportingTimer.current) clearTimeout(gaReportingTimer.current);
      if (gaIndividualTimer.current) clearTimeout(gaIndividualTimer.current);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') setupWebEnvironment();
    loadSavedData();
  }, []);

  // MANTIKSAL ZIRH: Dinamik SEO Motoru (Dil değiştiğinde Meta Etiketler de değişir)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = language === 'tr' ? "YDY Not Hesaplama Sistemi" : "SFL Grade Calculator";
      
      let metaDesc = document.querySelector("meta[name='description']");
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = t.metaDesc;

      let metaKeys = document.querySelector("meta[name='keywords']");
      if (!metaKeys) {
        metaKeys = document.createElement('meta');
        metaKeys.name = "keywords";
        document.head.appendChild(metaKeys);
      }
      metaKeys.content = t.metaKeys;
    }
  }, [language]);

  const setupWebEnvironment = () => {
    if (typeof window !== 'undefined') {
      if (!document.getElementById('google-analytics')) {
        const script1 = document.createElement('script');
        script1.id = 'google-analytics'; script1.async = true;
        script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
        document.head.appendChild(script1);
      }
      if (!document.getElementById('google-analytics-config')) {
        const script2 = document.createElement('script');
        script2.id = 'google-analytics-config';
        script2.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_TRACKING_ID}',{'send_page_view':true});`;
        document.head.appendChild(script2);
      }
      if (!document.querySelector("link[rel*='icon']")) {
        const favicon = document.createElement('link'); favicon.type = 'image/png'; favicon.rel = 'shortcut icon'; favicon.href = 'https://cdn-icons-png.flaticon.com/512/2643/2643506.png';
        document.getElementsByTagName('head')[0].appendChild(favicon);
      }
    }
  };

  const loadSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('@ydy_data');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        let loadedGrades = parsed.grades || grades;
        if (typeof loadedGrades.writing === 'string') loadedGrades.writing = [loadedGrades.writing, ''];
        if (typeof loadedGrades.sunum === 'string') loadedGrades.sunum = [loadedGrades.sunum, ''];
        if (typeof loadedGrades.kanaat === 'string') loadedGrades.kanaat = [loadedGrades.kanaat, ''];
        if (typeof loadedGrades.odev === 'string') loadedGrades.odev = [loadedGrades.odev, ''];
        
        setGrades(loadedGrades);
        setSelectedCourse(parsed.selectedCourse || 'A');
        setStudentName(parsed.studentName || '');
        if (parsed.activeTheme && THEMES[parsed.activeTheme]) setActiveTheme(parsed.activeTheme);
        if (parsed.language && TRANSLATIONS[parsed.language]) setLanguage(parsed.language);
      }
    } catch (e) { console.error(e); } finally { setIsLoaded(true); }
  };

  const saveData = async () => {
    if (!isLoaded) return;
    try { await AsyncStorage.setItem('@ydy_data', JSON.stringify({ grades, selectedCourse, studentName, activeTheme, language })); } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (!isLoaded) return;
    if (debounceCalcTimer.current) clearTimeout(debounceCalcTimer.current);
    debounceCalcTimer.current = setTimeout(() => { calculateGrade(); }, 150);
  }, [grades, selectedCourse, language]);

  useEffect(() => {
    if (!isLoaded) return;
    if (debounceSaveTimer.current) clearTimeout(debounceSaveTimer.current);
    debounceSaveTimer.current = setTimeout(() => { saveData(); }, 150);
  }, [grades, selectedCourse, studentName, activeTheme, language]);

  const handleThemeChange = (newTheme) => {
    setActiveTheme(newTheme);
    if (typeof window !== 'undefined' && window.gtag) { window.gtag('event', 'tema_degisti', { 'event_category': 'Tercihler', 'event_label': `Tema: ${newTheme}` }); }
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    if (typeof window !== 'undefined' && window.gtag) { window.gtag('event', 'dil_degisti', { 'event_category': 'Tercihler', 'event_label': `Dil: ${lang}` }); }
  };

  const handleCourseSelection = (course) => {
    setSelectedCourse(course);
    if (typeof window !== 'undefined' && window.gtag) { window.gtag('event', `kur_secildi_${course}`, { 'event_category': 'Navigasyon' }); }
  };

  const calculateGrade = () => {
    const qP = (grades.quiz.map(v => parseFloat(v) || 0).reduce((a, b) => a + b, 0) / 4 / 100) * 20;
    const vP = (grades.vize.map(v => parseFloat(v) || 0).reduce((a, b) => a + b, 0) / 4 / 100) * 60;
    const wP = ((parseFloat(grades.writing[0]) || 0) * 0.025) + ((parseFloat(grades.writing[1]) || 0) * 0.025);
    const sP = ((parseFloat(grades.sunum[0]) || 0) * 0.025) + ((parseFloat(grades.sunum[1]) || 0) * 0.025);
    const kP = ((parseFloat(grades.kanaat[0]) || 0) * 0.025) + ((parseFloat(grades.kanaat[1]) || 0) * 0.025);
    const oP = ((parseFloat(grades.odev[0]) || 0) * 0.025) + ((parseFloat(grades.odev[1]) || 0) * 0.025);
    
    const rawOrt = qP + vP + wP + sP + kP + oP;
    const ort = parseFloat(rawOrt.toFixed(2));
    
    const limit = selectedCourse === 'A' ? 84.5 : selectedCourse === 'B' ? 79.5 : 74.5;
    const needed = Math.ceil((65 - (ort * 0.4)) / 0.6);
    let res = { ortalama: ort.toFixed(2), durum: '', renk: '', fH: null, bH: null };
    let localTargetText = null;

    if (ort >= limit) {
      res.durum = t.pass; res.renk = theme.accent;
      if (grades.final !== '') res.fH = (parseFloat(grades.final) * 0.6 + ort * 0.4).toFixed(2);
      setTargetNote({ type: 'pass', text: t.pass });
    } else if (grades.final === '' && grades.butunleme === '') {
      res.durum = t.finalFail; res.renk = '#ef4444';
      if (needed <= 100) { setTargetNote({ type: 'target', text: `${t.neededFinal}${needed}` }); localTargetText = `Final Hedefi: ${needed}`; } 
      else { setTargetNote({ type: 'fail', text: t.impossible }); localTargetText = 'Kritik: Finalde 100 yetmiyor'; }
    } else if (grades.butunleme === '') {
      const fS = (parseFloat(grades.final) * 0.6 + ort * 0.4).toFixed(2); res.fH = fS; 
      if (fS >= 64.5) { res.durum = t.finalPass; res.renk = theme.accent; setTargetNote(null); } 
      else {
        res.durum = t.butFail; res.renk = '#ef4444';
        if (needed <= 100) { setTargetNote({ type: 'target', text: `${t.neededBut}${needed}` }); localTargetText = `Büt Hedefi: ${needed}`; } 
        else { setTargetNote({ type: 'fail', text: t.impossible }); localTargetText = 'Kritik: Bütte 100 yetmiyor'; }
      }
    } else {
      if (grades.final !== '') res.fH = (parseFloat(grades.final) * 0.6 + ort * 0.4).toFixed(2);
      const bS = (parseFloat(grades.butunleme) * 0.6 + ort * 0.4).toFixed(2); res.bH = bS;
      const isP = bS >= 64.5; res.durum = isP ? t.butPass : t.fail; res.renk = isP ? theme.accent : '#ef4444';
      setTargetNote(null);
    }
    setResults(res);

    if (ort > 0 && typeof window !== 'undefined' && window.gtag) {
       if (gaReportingTimer.current) clearTimeout(gaReportingTimer.current);
       if (gaIndividualTimer.current) clearTimeout(gaIndividualTimer.current);
       
       gaReportingTimer.current = setTimeout(() => {
         const detayText = `Q:[${grades.quiz.map(x=>x||'-').join(',')}] V:[${grades.vize.map(x=>x||'-').join(',')}] W:[${grades.writing.map(x=>x||'-').join(',')}] S:[${grades.sunum.map(x=>x||'-').join(',')}] K:[${grades.kanaat.map(x=>x||'-').join(',')}] O:[${grades.odev.map(x=>x||'-').join(',')}] F:${grades.final||'-'} B:${grades.butunleme||'-'}`;
         
         window.gtag('event', `karne_${selectedCourse}`, { 'event_category': 'Performans', 'event_label': `Ort: ${ort.toFixed(2)}`, 'karne_ozeti': detayText, 'value': parseFloat(ort.toFixed(2)) });
         if (localTargetText) window.gtag('event', `hedef_${selectedCourse}`, { 'event_category': 'Performans', 'event_label': localTargetText });
         
         gaIndividualTimer.current = setTimeout(() => {
           const allExams = [
             { name: 'Quiz 1', val: grades.quiz[0] }, { name: 'Quiz 2', val: grades.quiz[1] }, { name: 'Quiz 3', val: grades.quiz[2] }, { name: 'Quiz 4', val: grades.quiz[3] },
             { name: 'Vize 1', val: grades.vize[0] }, { name: 'Vize 2', val: grades.vize[1] }, { name: 'Vize 3', val: grades.vize[2] }, { name: 'Vize 4', val: grades.vize[3] },
             { name: 'Writing 1', val: grades.writing[0] }, { name: 'Writing 2', val: grades.writing[1] },
             { name: 'Sunum 1', val: grades.sunum[0] }, { name: 'Sunum 2', val: grades.sunum[1] },
             { name: 'Kanaat 1', val: grades.kanaat[0] }, { name: 'Kanaat 2', val: grades.kanaat[1] },
             { name: 'Odev 1', val: grades.odev[0] }, { name: 'Odev 2', val: grades.odev[1] },
             { name: 'Final', val: grades.final }, { name: 'Butunleme', val: grades.butunleme }
           ];

           allExams.forEach(exam => {
             if (exam.val !== '') {
               const safeName = exam.name.replace(' ', '_');
               window.gtag('event', `notlar_${selectedCourse}_${safeName}`, { 
                 'event_category': `${selectedCourse} Kuru`, 
                 'event_label': exam.name, 
                 'value': parseFloat(exam.val) 
               });
             }
           });
         }, 50);

       }, 3500); 
    }
  };

  const handleReset = () => {
    setGrades({ quiz:['','','',''], vize:['','','',''], writing:['',''], sunum:['',''], kanaat:['',''], odev:['',''], final:'', butunleme:'' });
    if (typeof window !== 'undefined' && window.gtag) { window.gtag('event', `sifirlama_${selectedCourse}`, { 'event_category': 'Etkilesim' }); }
  };

  const shareOnWhatsApp = () => {
    if (!results) return;
    let text = `📊 ${t.waMsg}\n\n• ${t.waLevel}: ${selectedCourse}\n• ${t.waAvg}: ${results.ortalama}\n`;
    if (grades.final !== '' && results.fH && grades.butunleme === '') text += `• ${t.waFinalNote}: ${results.fH}\n`;
    if (grades.butunleme !== '' && results.bH) text += `• ${t.waButNote}: ${results.bH}\n`;
    text += `• ${t.waStatus}: ${results.durum}\n`;
    if (targetNote && targetNote.text) text += `• ${targetNote.text}\n`;
    if (typeof window !== 'undefined') text += `\n${t.waLink}\n${window.location.href}`;
    
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', `whatsapp_${selectedCourse}`, { 'event_category': 'Sosyal', 'event_label': `Ort: ${results.ortalama}` });
    }
    setTimeout(() => { Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`); }, 400);
  };

  const handleSendFeedback = () => {
    if (!feedbackText.trim() || typeof window === 'undefined' || !window.gtag) return;
    const payload = `${studentName.trim() || 'İsimsiz'}: ${feedbackText.trim()}`;
    window.gtag('event', `mesaj_${selectedCourse}`, { 'event_category': 'GeriBildirim', 'event_label': payload });
    alert(t.successMsg); 
    setFeedbackText(''); 
  };

  const handleGradeChange = (field, index, textVal) => {
    const v = textVal === '' ? '' : textVal.replace(/[^0-9]/g, '');
    if (v !== '' && parseInt(v) > 100) return; 
    
    setGrades(prev => {
      const newGrades = { ...prev };
      if (Array.isArray(newGrades[field])) { 
        const newArr = [...newGrades[field]]; 
        newArr[index] = v; 
        newGrades[field] = newArr; 
      } else { 
        newGrades[field] = v; 
      }
      return newGrades;
    });
  };

  const renderInput = (label, field, index = null) => {
    const val = index !== null ? grades[field][index] : grades[field];
    return (
      <View style={styles.flexItem}>
        <Text style={[styles.iL, { color: theme.text }]}>{label}</Text>
        <TextInput 
          style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]} 
          keyboardType="numeric" 
          value={val} 
          onChangeText={textVal => handleGradeChange(field, index, textVal)} 
          maxLength={3} 
        />
      </View>
    );
  };

  if (!isLoaded) return null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <StatusBar style={activeTheme === 'light' ? "dark" : "light"} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={isMobile ? styles.headerRowMobile : styles.headerRowDesktop}>
            
            <View style={[styles.langContainer, { position: 'absolute', left: 0, top: 0, zIndex: 9999, elevation: 10 }]}>
              <TouchableOpacity 
                onPress={() => handleLanguageChange('tr')} 
                style={[styles.langBox, { backgroundColor: language === 'tr' ? theme.accent : theme.card, borderColor: language === 'tr' ? theme.accent : theme.border }]}
              >
                <Text style={{ fontSize: IS_WIN ? 15 : 22, fontWeight: 'bold', color: language === 'tr' ? '#fff' : theme.text, textAlign: 'center' }}>{TR_ICON}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => handleLanguageChange('en')} 
                style={[styles.langBox, { backgroundColor: language === 'en' ? theme.accent : theme.card, borderColor: language === 'en' ? theme.accent : theme.border, marginLeft: 8 }]}
              >
                <Text style={{ fontSize: IS_WIN ? 15 : 22, fontWeight: 'bold', color: language === 'en' ? '#fff' : theme.text, textAlign: 'center' }}>{EN_ICON}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: theme.text, fontSize: isMobile ? 40 : 48 }]}>{t.sysTitle}</Text>
              <Text style={[styles.subtitle, { color: theme.accent }]}>{t.sysSub}</Text>
            </View>
            
            <View style={[styles.controlsSelector, isMobile ? { marginTop: 24 } : { position: 'absolute', right: 0, zIndex: 9999, elevation: 10 }]}>
              {Object.values(THEMES).map(themeObj => (
                <TouchableOpacity key={themeObj.id} onPress={() => handleThemeChange(themeObj.id)} style={[styles.themeBox, { backgroundColor: themeObj.card, borderColor: activeTheme === themeObj.id ? themeObj.accent : themeObj.border }]}>
                  <Text style={styles.themeIcon}>{themeObj.icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.accent }]}>{t.levelSelect}</Text>
            <View style={styles.simetricRow}>
              {['A', 'B', 'C'].map((k, i) => (
                <TouchableOpacity key={k} onPress={() => handleCourseSelection(k)} style={[styles.kurBtn, { backgroundColor: selectedCourse === k ? theme.accent : theme.bg, borderColor: theme.border, marginLeft: i === 0 ? 0 : 16 }]}>
                  <Text style={[styles.kurBtnT, { color: selectedCourse === k ? '#fff' : theme.text }]}>
                    {language === 'tr' ? `${k} ${t.levelSuffix}` : `${t.levelSuffix} ${k}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.accent }]}>{t.term1}</Text>
            <View style={styles.simetricRow}>{renderInput(`${t.quiz} 1`, 'quiz', 0)}<View style={styles.gap16}/>{renderInput(`${t.vize} 1`, 'vize', 0)}</View>
            <View style={{height: 16}}/>
            <View style={styles.simetricRow}>{renderInput(`${t.quiz} 2`, 'quiz', 1)}<View style={styles.gap16}/>{renderInput(`${t.vize} 2`, 'vize', 1)}</View>
            <View style={{height: 16}}/>
            <View style={styles.simetricRow}>{renderInput(`${t.writing} 1`, 'writing', 0)}<View style={styles.gap16}/>{renderInput(`${t.sunum} 1`, 'sunum', 0)}</View>
            <View style={{height: 16}}/>
            <View style={styles.simetricRow}>{renderInput(`${t.kanaat} 1`, 'kanaat', 0)}<View style={styles.gap16}/>{renderInput(`${t.odev} 1`, 'odev', 0)}</View>
          </View>

          <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.accent }]}>{t.term2}</Text>
            <View style={styles.simetricRow}>{renderInput(`${t.quiz} 3`, 'quiz', 2)}<View style={styles.gap16}/>{renderInput(`${t.vize} 3`, 'vize', 2)}</View>
            <View style={{height: 16}}/>
            <View style={styles.simetricRow}>{renderInput(`${t.quiz} 4`, 'quiz', 3)}<View style={styles.gap16}/>{renderInput(`${t.vize} 4`, 'vize', 3)}</View>
            <View style={{height: 16}}/>
            <View style={styles.simetricRow}>{renderInput(`${t.writing} 2`, 'writing', 1)}<View style={styles.gap16}/>{renderInput(`${t.sunum} 2`, 'sunum', 1)}</View>
            <View style={{height: 16}}/>
            <View style={styles.simetricRow}>{renderInput(`${t.kanaat} 2`, 'kanaat', 1)}<View style={styles.gap16}/>{renderInput(`${t.odev} 2`, 'odev', 1)}</View>
          </View>
          
          <View style={styles.simetricRow}>
            <View style={[styles.section, styles.flexItem, { backgroundColor: theme.card, borderColor: theme.border }]}>{renderInput(t.final, 'final')}</View>
            <View style={styles.gap16} />
            <View style={[styles.section, styles.flexItem, { backgroundColor: theme.card, borderColor: theme.border }]}>{renderInput(t.butunleme, 'butunleme')}</View>
          </View>

          {results && (
            <View style={[styles.res, { borderTopColor: results.renk, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
              <Text style={[styles.resSt, { color: results.renk }]}>{results.durum}</Text>
              <Text style={[styles.resN, { color: theme.text }]}>{t.average} {results.ortalama}</Text>
              {targetNote && <Text style={[styles.targetT, { color: targetNote.type === 'fail' ? '#ef4444' : theme.accent }]}>{targetNote.text}</Text>}
              <TouchableOpacity style={styles.resetBtn} onPress={handleReset}><Text style={styles.resetBtnT}>{t.reset}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.waBtn} onPress={shareOnWhatsApp}><Text style={styles.waBtnT}>📲 {t.share}</Text></TouchableOpacity>
            </View>
          )}

          <View style={[styles.feedbackCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.accent }]}>{t.feedbackTitle}</Text>
            <Text style={[styles.iL, { color: theme.text }]}>{t.nameLabel}</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border, marginBottom: 16, textAlign: 'left' }]} 
              value={studentName} 
              onChangeText={setStudentName} 
              placeholder={t.namePlace} 
              placeholderTextColor={theme.textSecondary} 
              maxLength={35} // MANTIKSAL ZIRH: GA4 Truncation Kalkanı
            />
            <TextInput 
              style={[styles.fInputMultiline, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]} 
              placeholder={t.msgPlace} 
              placeholderTextColor={theme.textSecondary} 
              value={feedbackText} 
              onChangeText={setFeedbackText} 
              maxLength={100} 
              multiline={true} 
            />
            <TouchableOpacity style={[styles.fSendBtn, {backgroundColor: theme.accent}]} onPress={handleSendFeedback}>
              <Text style={styles.fSendBtnT}>{t.sendBtn}</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.footerBrand}>Created by Alparslan Soyak</Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, 
  scroll: { padding: 16 },
  headerRowMobile: { alignItems: 'center', marginTop: 40, marginBottom: 40, position: 'relative', zIndex: 1 },
  headerRowDesktop: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 40, marginBottom: 40, position: 'relative', zIndex: 1 },
  titleContainer: { alignItems: 'center' },
  title: { fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  subtitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  langContainer: { flexDirection: 'row' },
  controlsSelector: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  langBox: { width: 44, height: 36, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  themeBox: { width: 36, height: 36, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  themeIcon: { fontSize: 16 },
  section: { borderRadius: 16, padding: 18, marginBottom: 24, borderWidth: 1 },
  label: { fontSize: 12, fontWeight: '800', marginBottom: 16, letterSpacing: 1 },
  simetricRow: { flexDirection: 'row', width: '100%' }, 
  flexItem: { flex: 1 }, 
  gap16: { width: 16 },
  kurBtn: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  kurBtnT: { fontWeight: 'bold', fontSize: 15 },
  iL: { fontSize: 12, marginBottom: 8, fontWeight: '800' },
  input: { borderRadius: 10, padding: 14, borderWidth: 1, fontSize: 15, textAlign: 'center', minHeight: 50 },
  res: { borderRadius: 20, padding: 24, borderTopWidth: 5, marginBottom: 80 },
  resSt: { fontWeight: 'bold', fontSize: 20, marginBottom: 4 },
  resN: { fontSize: 32, fontWeight: '900' },
  targetT: { fontSize: 14, marginTop: 12, fontWeight: '700' },
  resetBtn: { width: '100%', padding: 16, borderRadius: 10, alignItems: 'center', backgroundColor: '#ef4444', marginTop: 24 },
  resetBtnT: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  waBtn: { backgroundColor: '#25D366', marginTop: 12, padding: 16, borderRadius: 10, alignItems: 'center' },
  waBtnT: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  feedbackCard: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 30 },
  fInputMultiline: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 15, minHeight: 120, textAlignVertical: 'top', marginBottom: 16 },
  fSendBtn: { borderRadius: 12, padding: 16, alignItems: 'center' },
  fSendBtnT: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  footerBrand: { textAlign: 'center', color: '#64748b', fontSize: 16, fontWeight: '800', marginBottom: 20 }
});
// --- DOSYA SONU (EOF) ---
