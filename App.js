import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, TextInput, StyleSheet, Platform, Linking, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GA_TRACKING_ID = 'G-FD2290G3VG';

const THEMES = {
  dark: { id: 'dark', icon: '🌙', bg: '#0f172a', card: '#1e293b', text: '#ffffff', textSecondary: '#94a3b8', border: '#334155', accent: '#a855f7' },
  light: { id: 'light', icon: '☀️', bg: '#f8fafc', card: '#ffffff', text: '#1e293b', textSecondary: '#64748b', border: '#e2e8f0', accent: '#a855f7' },
  ocean: { id: 'ocean', icon: '🌊', bg: '#082f49', card: '#0c4a6e', text: '#f0f9ff', textSecondary: '#bae6fd', border: '#0284c7', accent: '#0ea5e9' },
  hacker: { id: 'hacker', icon: '💻', bg: '#000000', card: '#052e16', text: '#4ade80', textSecondary: '#22c55e', border: '#166534', accent: '#a855f7' }
};

export default function App() {
  const { width } = useWindowDimensions();
  const isMobile = width < 600; 

  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTheme, setActiveTheme] = useState('hacker'); 
  const [studentName, setStudentName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('A');
  const [grades, setGrades] = useState({
    quiz: ['', '', '', ''], vize: ['', '', '', ''],
    writing: ['', ''], sunum: ['', ''], kanaat: ['', ''], odev: ['', ''], 
    final: '', butunleme: '',
  });

  const [results, setResults] = useState(null);
  const [targetNote, setTargetNote] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');

  const debounceCalcTimer = React.useRef(null);
  const debounceSaveTimer = React.useRef(null);
  const calcCount = React.useRef(0);
  const resetCount = React.useRef(0);

  const theme = THEMES[activeTheme] || THEMES.hacker;

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = "YDY Not Hesaplama Sistemi";
      setupWebEnvironment();
    }
    loadSavedData();
  }, []);

  const setupWebEnvironment = () => {
    if (typeof window !== 'undefined' && !document.getElementById('google-analytics')) {
      const script1 = document.createElement('script');
      script1.id = 'google-analytics'; script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
      document.head.appendChild(script1);
      const script2 = document.createElement('script');
      script2.id = 'google-analytics-config';
      script2.innerHTML = `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${GA_TRACKING_ID}', { 'send_page_view': true });`;
      document.head.appendChild(script2);
    }
    
    if (typeof document !== 'undefined') {
      if (!document.querySelector("link[rel*='icon']")) {
        const favicon = document.createElement('link'); favicon.type = 'image/png'; favicon.rel = 'shortcut icon';
        favicon.href = 'https://cdn-icons-png.flaticon.com/512/2643/2643506.png';
        document.getElementsByTagName('head')[0].appendChild(favicon);
      }
      if (!document.querySelector("meta[name='description']")) {
        const metaDesc = document.createElement('meta'); metaDesc.name = "description"; metaDesc.content = "Üniversite öğrencileri için en hızlı ve hatasız YDY Not Hesaplama Sistemi. A, B ve C kurları için vize, final ve bütünleme ortalamanızı anında öğrenin."; document.head.appendChild(metaDesc);
        const metaKeywords = document.createElement('meta'); metaKeywords.name = "keywords"; metaKeywords.content = "ydy not hesaplama, hazırlık atlama, vize final hesaplama, üniversite not ortalaması, ydy kur hesaplama, üniversite hazırlık"; document.head.appendChild(metaKeywords);
      }
    }
  };

  const loadSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('@ydy_data');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        let loadedGrades = parsed.grades || grades;
        // Sessiz Veri Göçü: Eski kullanıcıların verileri yeni dizi formatına çevrilir, sistem çökmez.
        if (typeof loadedGrades.writing === 'string') loadedGrades.writing = [loadedGrades.writing, ''];
        if (typeof loadedGrades.sunum === 'string') loadedGrades.sunum = [loadedGrades.sunum, ''];
        if (typeof loadedGrades.kanaat === 'string') loadedGrades.kanaat = [loadedGrades.kanaat, ''];
        if (typeof loadedGrades.odev === 'string') loadedGrades.odev = [loadedGrades.odev, ''];
        
        setGrades(loadedGrades);
        setSelectedCourse(parsed.selectedCourse || 'A');
        setStudentName(parsed.studentName || '');
        if (parsed.activeTheme && THEMES[parsed.activeTheme]) setActiveTheme(parsed.activeTheme);
      }
    } catch (e) { console.error(e); } finally { setIsLoaded(true); }
  };

  const saveData = async () => {
    if (!isLoaded) return;
    try { await AsyncStorage.setItem('@ydy_data', JSON.stringify({ grades, selectedCourse, studentName, activeTheme })); } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (!isLoaded) return;
    if (debounceCalcTimer.current) clearTimeout(debounceCalcTimer.current);
    debounceCalcTimer.current = setTimeout(() => { calculateGrade(); }, 150);
  }, [grades, selectedCourse]);

  useEffect(() => {
    if (!isLoaded) return;
    if (debounceSaveTimer.current) clearTimeout(debounceSaveTimer.current);
    debounceSaveTimer.current = setTimeout(() => { saveData(); }, 150);
  }, [grades, selectedCourse, studentName, activeTheme]);

  const handleThemeChange = (newTheme) => {
    setActiveTheme(newTheme);
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'tema_degisti', { 'event_category': 'Tercihler', 'event_label': `Tema: ${newTheme}` });
    }
  };

  const handleCourseSelection = (course) => {
    setSelectedCourse(course);
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'kur_secildi', { 'event_category': 'Etkilesim', 'event_label': `${course} Kuru Seçildi` });
    }
  };

  const calculateGrade = () => {
    const qP = (grades.quiz.map(v => parseFloat(v) || 0).reduce((a, b) => a + b, 0) / 4 / 100) * 20;
    const vP = (grades.vize.map(v => parseFloat(v) || 0).reduce((a, b) => a + b, 0) / 4 / 100) * 60;
    
    // Katsayılar mutlak olarak 0.025 (%2.5) oranında işlenir
    const wP = ((parseFloat(grades.writing[0]) || 0) * 0.025) + ((parseFloat(grades.writing[1]) || 0) * 0.025);
    const sP = ((parseFloat(grades.sunum[0]) || 0) * 0.025) + ((parseFloat(grades.sunum[1]) || 0) * 0.025);
    const kP = ((parseFloat(grades.kanaat[0]) || 0) * 0.025) + ((parseFloat(grades.kanaat[1]) || 0) * 0.025);
    const oP = ((parseFloat(grades.odev[0]) || 0) * 0.025) + ((parseFloat(grades.odev[1]) || 0) * 0.025);
    
    const ort = qP + vP + wP + sP + kP + oP;
    const limit = selectedCourse === 'A' ? 84.5 : selectedCourse === 'B' ? 79.5 : 74.5;
    
    const needed = Math.ceil((65 - (ort * 0.4)) / 0.6);
    let res = { ortalama: ort.toFixed(2), durum: '', renk: '', fH: null, bH: null };
    let localTargetText = null;

    if (ort >= limit) {
      res.durum = 'Geçtiniz ✓'; res.renk = theme.accent;
      if (grades.final !== '') res.fH = (parseFloat(grades.final) * 0.6 + ort * 0.4).toFixed(2);
      setTargetNote({ type: 'pass', text: 'Geçmek için ortalaman yeterli!' });
    } else if (grades.final === '' && grades.butunleme === '') {
      res.durum = 'Finale Kaldınız'; res.renk = '#ef4444';
      if (needed <= 100) { setTargetNote({ type: 'target', text: `Finalde gereken: ${needed}` }); localTargetText = `Final Hedefi: ${needed}`; } 
      else { setTargetNote({ type: 'fail', text: '100 alsan da geçilemiyor!' }); localTargetText = 'Kritik Durum: Finalde 100 yetmiyor'; }
    } else if (grades.butunleme === '') {
      const fS = (parseFloat(grades.final) * 0.6 + ort * 0.4).toFixed(2); res.fH = fS; 
      if (fS >= 64.5) { res.durum = 'Finalle Geçtiniz ✓'; res.renk = theme.accent; setTargetNote(null); } 
      else {
        res.durum = 'Bütünlemeye Kaldınız'; res.renk = '#ef4444';
        if (needed <= 100) { setTargetNote({ type: 'target', text: `Bütünlemede gereken: ${needed}` }); localTargetText = `Büt Hedefi: ${needed}`; } 
        else { setTargetNote({ type: 'fail', text: 'Bütünlemede 100 alsan da geçilemiyor!' }); localTargetText = 'Kritik Durum: Bütte 100 yetmiyor'; }
      }
    } else {
      if (grades.final !== '') res.fH = (parseFloat(grades.final) * 0.6 + ort * 0.4).toFixed(2);
      const bS = (parseFloat(grades.butunleme) * 0.6 + ort * 0.4).toFixed(2); res.bH = bS;
      const isP = bS >= 64.5; res.durum = isP ? 'Bütünleme ile Geçtiniz ✓' : 'Kaldınız ✗'; res.renk = isP ? theme.accent : '#ef4444';
      setTargetNote(null);
    }
    
    if (ort > 0 && typeof window !== 'undefined' && window.gtag && JSON.stringify(results) !== JSON.stringify(res)) {
       // Karne Özeti 1. ve 2. Dönem ayrımlarını ('|' sembolüyle) merkeze alır
       const detayText = `Q:[${grades.quiz[0]||'-'},${grades.quiz[1]||'-'}|${grades.quiz[2]||'-'},${grades.quiz[3]||'-'}] V:[${grades.vize[0]||'-'},${grades.vize[1]||'-'}|${grades.vize[2]||'-'},${grades.vize[3]||'-'}] W:[${grades.writing[0]||'-'}|${grades.writing[1]||'-'}] S:[${grades.sunum[0]||'-'}|${grades.sunum[1]||'-'}] K:[${grades.kanaat[0]||'-'}|${grades.kanaat[1]||'-'}] O:[${grades.odev[0]||'-'}|${grades.odev[1]||'-'}] F:${grades.final||'-'} B:${grades.butunleme||'-'}`;
       let numericParams = { 'event_category': 'Performans', 'event_label': `Kur: ${selectedCourse} | Ort: ${ort.toFixed(2)} | Durum: ${res.durum}`, 'kur_seviyesi': selectedCourse, 'karne_ozeti': detayText, 'value': parseFloat(ort.toFixed(2)) };

       if (grades.quiz[0] !== '') numericParams.quiz_1 = parseFloat(grades.quiz[0]);
       if (grades.quiz[1] !== '') numericParams.quiz_2 = parseFloat(grades.quiz[1]);
       if (grades.quiz[2] !== '') numericParams.quiz_3 = parseFloat(grades.quiz[2]);
       if (grades.quiz[3] !== '') numericParams.quiz_4 = parseFloat(grades.quiz[3]);
       if (grades.vize[0] !== '') numericParams.vize_1 = parseFloat(grades.vize[0]);
       if (grades.vize[1] !== '') numericParams.vize_2 = parseFloat(grades.vize[1]);
       if (grades.vize[2] !== '') numericParams.vize_3 = parseFloat(grades.vize[2]);
       if (grades.vize[3] !== '') numericParams.vize_4 = parseFloat(grades.vize[3]);
       if (grades.writing[0] !== '') numericParams.writing_1 = parseFloat(grades.writing[0]);
       if (grades.writing[1] !== '') numericParams.writing_2 = parseFloat(grades.writing[1]);
       if (grades.sunum[0] !== '') numericParams.sunum_1 = parseFloat(grades.sunum[0]);
       if (grades.sunum[1] !== '') numericParams.sunum_2 = parseFloat(grades.sunum[1]);
       if (grades.kanaat[0] !== '') numericParams.kanaat_1 = parseFloat(grades.kanaat[0]);
       if (grades.kanaat[1] !== '') numericParams.kanaat_2 = parseFloat(grades.kanaat[1]);
       if (grades.odev[0] !== '') numericParams.odev_1 = parseFloat(grades.odev[0]);
       if (grades.odev[1] !== '') numericParams.odev_2 = parseFloat(grades.odev[1]);
       if (grades.final !== '') numericParams.final_notu = parseFloat(grades.final);
       if (grades.butunleme !== '') numericParams.butunleme_notu = parseFloat(grades.butunleme);

       window.gtag('event', 'not_hesaplandi', numericParams);
       if (localTargetText) window.gtag('event', 'hedef_durumu', { 'event_category': 'Performans', 'event_label': localTargetText });

       calcCount.current += 1;
       if (calcCount.current > 1) window.gtag('event', 'senaryo_denemesi', { 'event_category': 'Etkilesim', 'event_label': `Senaryo Denemesi | Yeni Ort: ${ort.toFixed(2)}` });
    }
    setResults(res);
  };

  const handleReset = () => {
    setGrades({quiz:['','','',''],vize:['','','',''],writing:['',''],sunum:['',''],kanaat:['',''],odev:['',''],final:'',butunleme:''});
    calcCount.current = 0; resetCount.current += 1;
    if (typeof window !== 'undefined' && window.gtag) window.gtag('event', 'coklu_sifirlama', { 'event_category': 'Etkilesim', 'event_label': `Çoklu Hesaplama (Sıfırlama Sayısı: ${resetCount.current})` });
  };

  const shareOnWhatsApp = () => {
    if (!results) return;
    let text = `📊 YDY Not Hesaplama Sonucum\n\n• Kur Seviyesi: ${selectedCourse} Kuru\n• Güncel Ortalama: ${results.ortalama}\n`;
    if (grades.final !== '' && results.fH && grades.butunleme === '') text += `• Yıl Sonu Notu: ${results.fH}\n`;
    if (grades.butunleme !== '' && results.bH) text += `• Büt. Sonu Notu: ${results.bH}\n`;
    text += `• Akademik Durum: ${results.durum}\n`;
    if (targetNote && targetNote.text) text += `• ${targetNote.text}\n`;
    if (typeof window !== 'undefined') text += `\nSistemi kullan:\n${window.location.href}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
    if (typeof window !== 'undefined' && window.gtag) window.gtag('event', 'whatsapp_paylasimi', { 'event_category': 'Sosyal', 'event_label': 'WhatsApp Paylaşımı Yapıldı' });
  };

  const handleSendFeedback = () => {
    if (!feedbackText.trim() || typeof window === 'undefined' || !window.gtag) return;
    const payload = `[${selectedCourse}] ${studentName.trim() || 'İsimsiz'}: ${feedbackText.trim()}`;
    window.gtag('event', 'kullanici_mesaji', { 'event_category': 'GeriBildirim', 'event_label': payload });
    alert('Mesajınız başarıyla iletildi!'); setFeedbackText(''); 
  };

  const renderInput = (label, field, index = null) => {
    const val = index !== null ? grades[field][index] : grades[field];
    return (
      <View style={styles.flexItem}>
        <Text style={[styles.iL, { color: theme.text }]}>{label}</Text>
        <TextInput style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]} keyboardType="numeric" value={val} 
          onChangeText={t => {
            const v = t === '' ? '' : t.replace(/[^0-9]/g, '');
            if (v !== '' && parseInt(v) > 100) {
              if (typeof window !== 'undefined' && window.gtag) window.gtag('event', 'hatali_giris', { 'event_category': 'Hata', 'event_label': `Hatalı Not (>100): ${label}` });
              return; 
            }
            if (Array.isArray(grades[field])) { const n = [...grades[field]]; n[index] = v; setGrades({ ...grades, [field]: n }); } 
            else { setGrades({ ...grades, [field]: v }); }
          }} maxLength={3} />
      </View>
    );
  };

  if (!isLoaded) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={activeTheme === 'light' ? "dark" : "light"} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={isMobile ? styles.headerRowMobile : styles.headerRowDesktop}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: theme.text, fontSize: isMobile ? 40 : 48 }]}>YDY</Text>
            <Text style={[styles.subtitle, { color: theme.accent }]}>Not Hesaplama Sistemi</Text>
          </View>
          <View style={[styles.themeSelector, isMobile ? { marginTop: 24 } : { position: 'absolute', right: 0 }]}>
            {Object.values(THEMES).map(t => (
              <TouchableOpacity key={t.id} onPress={() => handleThemeChange(t.id)} style={[styles.themeBox, { backgroundColor: t.card, borderColor: activeTheme === t.id ? t.accent : t.border }]}>
                <Text style={styles.themeIcon}>{t.icon}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.accent }]}>KUR SEÇİMİ</Text>
          <View style={styles.simetricRow}>
            {['A', 'B', 'C'].map((k, i) => (
              <TouchableOpacity key={k} onPress={() => handleCourseSelection(k)} style={[styles.kurBtn, { backgroundColor: selectedCourse === k ? theme.accent : theme.bg, borderColor: theme.border, marginLeft: i === 0 ? 0 : 16 }]}>
                <Text style={[styles.kurBtnT, { color: selectedCourse === k ? '#fff' : theme.text }]}>{k} KURU</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 1. DÖNEM BÖLÜMÜ */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.accent }]}>1. DÖNEM NOTLARI</Text>
          <View style={styles.simetricRow}>{renderInput('QUIZ 1', 'quiz', 0)}<View style={styles.gap16}/>{renderInput('VİZE 1', 'vize', 0)}</View>
          <View style={{height: 16}}/>
          <View style={styles.simetricRow}>{renderInput('QUIZ 2', 'quiz', 1)}<View style={styles.gap16}/>{renderInput('VİZE 2', 'vize', 1)}</View>
          <View style={{height: 16}}/>
          <View style={styles.simetricRow}>{renderInput('WRITING 1', 'writing', 0)}<View style={styles.gap16}/>{renderInput('SUNUM 1', 'sunum', 0)}</View>
          <View style={{height: 16}}/>
          <View style={styles.simetricRow}>{renderInput('KANAAT 1', 'kanaat', 0)}<View style={styles.gap16}/>{renderInput('ONLİNE ÖDEV 1', 'odev', 0)}</View>
        </View>

        {/* 2. DÖNEM BÖLÜMÜ */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.accent }]}>2. DÖNEM NOTLARI</Text>
          <View style={styles.simetricRow}>{renderInput('QUIZ 3', 'quiz', 2)}<View style={styles.gap16}/>{renderInput('VİZE 3', 'vize', 2)}</View>
          <View style={{height: 16}}/>
          <View style={styles.simetricRow}>{renderInput('QUIZ 4', 'quiz', 3)}<View style={styles.gap16}/>{renderInput('VİZE 4', 'vize', 3)}</View>
          <View style={{height: 16}}/>
          <View style={styles.simetricRow}>{renderInput('WRITING 2', 'writing', 1)}<View style={styles.gap16}/>{renderInput('SUNUM 2', 'sunum', 1)}</View>
          <View style={{height: 16}}/>
          <View style={styles.simetricRow}>{renderInput('KANAAT 2', 'kanaat', 1)}<View style={styles.gap16}/>{renderInput('ONLİNE ÖDEV 2', 'odev', 1)}</View>
        </View>
        
        {/* FİNAL VE BÜTÜNLEME */}
        <View style={styles.simetricRow}>
          <View style={[styles.section, styles.flexItem, { backgroundColor: theme.card, borderColor: theme.border }]}>{renderInput('FİNAL', 'final')}</View><View style={styles.gap16} />
          <View style={[styles.section, styles.flexItem, { backgroundColor: theme.card, borderColor: theme.border }]}>{renderInput('BÜTÜNLEME', 'butunleme')}</View>
        </View>

        {results && (
          <View style={[styles.res, { borderTopColor: results.renk, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
            <Text style={[styles.resSt, { color: results.renk }]}>{results.durum}</Text>
            <Text style={[styles.resN, { color: theme.text }]}>ORTALAMA: {results.ortalama}</Text>
            {targetNote && <Text style={[styles.targetT, { color: targetNote.type === 'fail' ? '#ef4444' : theme.accent }]}>{targetNote.text}</Text>}
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}><Text style={styles.resetBtnT}>Tüm Notları Sıfırla</Text></TouchableOpacity>
            <TouchableOpacity style={styles.waBtn} onPress={shareOnWhatsApp}><Text style={styles.waBtnT}>WhatsApp ile Paylaş</Text></TouchableOpacity>
          </View>
        )}

        <View style={[styles.feedbackCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.accent }]}>ÖNERİ VE GERİ BİLDİRİM</Text>
          <Text style={[styles.iL, { color: theme.text }]}>AD SOYAD</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border, ma
