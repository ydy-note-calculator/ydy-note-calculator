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
    writing: '', sunum: '', kanaat: '', odev: '', final: '', butunleme: '',
  });

  const [results, setResults] = useState(null);
  const [targetNote, setTargetNote] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');

  const debounceTimer = React.useRef(null);
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
    if (!document.getElementById('google-analytics')) {
      const script1 = document.createElement('script');
      script1.id = 'google-analytics'; script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
      document.head.appendChild(script1);
      const script2 = document.createElement('script');
      script2.id = 'google-analytics-config';
      script2.innerHTML = `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${GA_TRACKING_ID}', { 'send_page_view': true });`;
      document.head.appendChild(script2);
    }
    if (!document.querySelector("link[rel*='icon']")) {
      const favicon = document.createElement('link'); favicon.type = 'image/png'; favicon.rel = 'shortcut icon';
      favicon.href = 'https://cdn-icons-png.flaticon.com/512/2643/2643506.png';
      document.getElementsByTagName('head')[0].appendChild(favicon);
    }
  };

  const loadSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('@ydy_data');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setGrades(parsed.grades || grades); setSelectedCourse(parsed.selectedCourse || 'A');
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
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      calculateGrade();
      saveData();
    }, 150);
    return () => clearTimeout(debounceTimer.current);
  }, [grades, selectedCourse, studentName, activeTheme]);

  const handleThemeChange = (newTheme) => {
    setActiveTheme(newTheme);
    if (window.gtag) {
      window.gtag('event', 'tema_degisti', { 'event_category': 'Tercihler', 'event_label': `Tema: ${newTheme}` });
    }
  };

  const handleCourseSelection = (course) => {
    setSelectedCourse(course);
    if (window.gtag) {
      window.gtag('event', 'kur_secildi', { 'event_category': 'Etkilesim', 'event_label': `${course} Kuru Seçildi` });
    }
  };

  const calculateGrade = () => {
    const qP = (grades.quiz.map(v => parseFloat(v) || 0).reduce((a, b) => a + b, 0) / 4 / 100) * 20;
    const vP = (grades.vize.map(v => parseFloat(v) || 0).reduce((a, b) => a + b, 0) / 4 / 100) * 60;
    const wP = (parseFloat(grades.writing) || 0) / 100 * 5; const sP = (parseFloat(grades.sunum) || 0) / 100 * 5;
    const kP = (parseFloat(grades.kanaat) || 0) / 100 * 5; const oP = (parseFloat(grades.odev) || 0) / 100 * 5;
    const ort = qP + vP + wP + sP + kP + oP;
    const limit = selectedCourse === 'A' ? 84.5 : selectedCourse === 'B' ? 79.5 : 74.5;
    
    const needed = Math.ceil((65 - (ort * 0.4)) / 0.6);
    let res = { ortalama: ort.toFixed(2), durum: '', renk: '', fH: null, bH: null };
    let localTargetText = null;

    if (ort >= limit) {
      res.durum = 'Geçtiniz ✓'; res.renk = theme.accent;
      if (grades.final !== '') res.fH = (parseFloat(grades.final) * 0.6 + ort * 0.4).toFixed(2);
      setTargetNote({ type: 'pass', text: 'Geçmek için ortalaman yeterli!' });
    } else if (grades.final === '') {
      res.durum = 'Finale Kaldınız'; res.renk = '#ef4444';
      if (needed <= 100) {
        setTargetNote({ type: 'target', text: `Finalde gereken: ${needed}` });
        localTargetText = `Final Hedefi: ${needed}`;
      } else {
        setTargetNote({ type: 'fail', text: '100 alsan da geçilemiyor!' });
        localTargetText = 'Kritik Durum: Finalde 100 yetmiyor';
      }
    } else {
      const fS = (parseFloat(grades.final) * 0.6 + ort * 0.4).toFixed(2); res.fH = fS; 
      if (fS >= 64.5) {
        res.durum = 'Finalle Geçtiniz ✓'; res.renk = theme.accent;
        setTargetNote(null);
      } else if (grades.butunleme === '') {
        res.durum = 'Bütünlemeye Kaldınız'; res.renk = '#ef4444';
        if (needed <= 100) {
          setTargetNote({ type: 'target', text: `Bütünlemede gereken: ${needed}` });
          localTargetText = `Büt Hedefi: ${needed}`;
        } else {
          setTargetNote({ type: 'fail', text: 'Bütünlemede 100 alsan da geçilemiyor!' });
          localTargetText = 'Kritik Durum: Bütte 100 yetmiyor';
        }
      } else {
        const bS = (parseFloat(grades.butunleme) * 0.6 + ort * 0.4).toFixed(2); res.bH = bS;
        const isP = bS >= 64.5; res.durum = isP ? 'Bütünleme ile Geçtiniz ✓' : 'Kaldınız ✗'; res.renk = isP ? theme.accent : '#ef4444';
        setTargetNote(null);
      }
    }
    
    if (ort > 0 && window.gtag && JSON.stringify(results) !== JSON.stringify(res)) {
       
       const detayText = `Q:[${grades.quiz.map(v=>v||'-').join(',')}] V:[${grades.vize.map(v=>v||'-').join(',')}] W:${grades.writing||'-'} S:${grades.sunum||'-'} K:${grades.kanaat||'-'} O:${grades.odev||'-'} F:${grades.final||'-'} B:${grades.butunleme||'-'}`;
       
       // İŞTE ÇÖZÜM: GOOGLE ANALYTICS İÇİN "SAF MATEMATİK" PAKETİ
       let numericParams = {
         'event_category': 'Performans',
         'event_label': `Kur: ${selectedCourse} | Ort: ${ort.toFixed(2)} | Durum: ${res.durum}`,
         'kur_seviyesi': selectedCourse,
         'karne_ozeti': detayText,
         'value': parseFloat(ort.toFixed(2)) // Ana Ortalama (Google bunu otomatik toplar ve böler)
       };

       // Girilen her notu saf sayı olarak pakete ekle (Boş kutular gönderilmez, ortalamayı bozmaz)
       if (grades.quiz[0] !== '') numericParams.quiz_1 = parseFloat(grades.quiz[0]);
       if (grades.quiz[1] !== '') numericParams.quiz_2 = parseFloat(grades.quiz[1]);
       if (grades.vize[0] !== '') numericParams.vize_1 = parseFloat(grades.vize[0]);
       if (grades.vize[1] !== '') numericParams.vize_2 = parseFloat(grades.vize[1]);
       if (grades.writing !== '') numericParams.writing_notu = parseFloat(grades.writing);
       if (grades.final !== '') numericParams.final_notu = parseFloat(grades.final);
       if (grades.butunleme !== '') numericParams.butunleme_notu = parseFloat(grades.butunleme);

       // Tüm bu sayılar Google'a tek seferde fırlatılır
       window.gtag('event', 'not_hesaplandi', numericParams);

       if (localTargetText) {
         window.gtag('event', 'hedef_durumu', { 'event_category': 'Performans', 'event_label': localTargetText });
       }

       calcCount.current += 1;
       if (calcCount.current > 1) {
         window.gtag('event', 'senaryo_denemesi', { 'event_category': 'Etkilesim', 'event_label': `Senaryo Denemesi | Yeni Ort: ${ort.toFixed(2)}` });
       }
    }

    setResults(res);
  };

  const handleReset = () => {
    setGrades({quiz:['','','',''],vize:['','','',''],writing:'',sunum:'',kanaat:'',odev:'',final:'',butunleme:''});
    calcCount.current = 0; 
    resetCount.current += 1;
    if (window.gtag) {
      window.gtag('event', 'coklu_sifirlama', { 'event_category': 'Etkilesim', 'event_label': `Çoklu Hesaplama (Sıfırlama Sayısı: ${resetCount.current})` });
    }
  };

  const shareOnWhatsApp = () => {
    if (!results) return;
    let text = `📊 YDY Not Hesaplama Sonucum\n\n• Kur Seviyesi: ${selectedCourse} Kuru\n• Güncel Ortalama: ${results.ortalama}\n`;
    if (grades.final !== '' && results.fH && grades.butunleme === '') { text += `• Yıl Sonu Notu: ${results.fH}\n`; }
    if (grades.butunleme !== '' && results.bH) { text += `• Büt. Sonu Notu: ${results.bH}\n`; }
    text += `• Akademik Durum: ${results.durum}\n`;
    if (targetNote && targetNote.text) { text += `• ${targetNote.text}\n`; }
    text += `\nKendi notunuzu hesaplamak için sistemi kullanabilirsiniz:\n${window.location.href}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
    
    if (window.gtag) window.gtag('event', 'whatsapp_paylasimi', { 'event_category': 'Sosyal', 'event_label': 'WhatsApp Paylaşımı Yapıldı' });
  };

  const handleSendFeedback = () => {
    if (!feedbackText.trim() || !window.gtag) return;
    const name = studentName.trim() || 'İsimsiz';
    const payload = `[${selectedCourse}] ${name}: ${feedbackText.trim()}`;
    window.gtag('event', 'kullanici_mesaji', { 'event_category': 'GeriBildirim', 'event_label': payload });
    alert('Mesajınız başarıyla iletildi!'); setFeedbackText(''); 
  };

  const renderInput = (label, field, index = null) => {
    const val = index !== null ? grades[field][index] : grades[field];
    return (
      <View style={styles.flexItem}>
        <Text style={[styles.iL, { color: theme.text }]}>{label}</Text>
        <TextInput 
          style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: val !== '' && parseInt(val) > 100 ? '#ef4444' : theme.border }]} 
          keyboardType="numeric" 
          value={val} 
          onChangeText={t => {
            const v = t === '' ? '' : t.replace(/[^0-9]/g, '');
            if (parseInt(v) > 100 && parseInt(val || '0') <= 100) {
              if (window.gtag) window.gtag('event', 'hatali_giris', { 'event_category': 'Hata', 'event_label': `Hatalı Not (>100): ${label}` });
            }
            if (Array.isArray(grades[field])) { const n = [...grades[field]]; n[index] = v; setGrades({ ...grades, [field]: n }); } 
            else { setGrades({ ...grades, [field]: v }); }
          }} 
          maxLength={3} 
        />
      </View>
    );
  };

  if (!isLoaded) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={activeTheme === 'light' ? "dark" : "light"} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
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

        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.accent }]}>QUIZ NOTLARI</Text>
          <View style={styles.simetricRow}>{renderInput('QUIZ 1', 'quiz', 0)}<View style={styles.gap16}/>{renderInput('QUIZ 2', 'quiz', 1)}</View>
          <View style={{height: 16}}/>
          <View style={styles.simetricRow}>{renderInput('QUIZ 3', 'quiz', 2)}<View style={styles.gap16}/>{renderInput('QUIZ 4', 'quiz', 3)}</View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.accent }]}>VİZE NOTLARI</Text>
          <View style={styles.simetricRow}>{renderInput('VİZE 1', 'vize', 0)}<View style={styles.gap16}/>{renderInput('VİZE 2', 'vize', 1)}</View>
          <View style={{height: 16}}/>
          <View style={styles.simetricRow}>{renderInput('VİZE 3', 'vize', 2)}<View style={styles.gap16}/>{renderInput('VİZE 4', 'vize', 3)}</View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.accent }]}>DİĞER NOTLAR</Text>
          <View style={styles.simetricRow}>{renderInput('WRITING', 'writing')}<View style={styles.gap16}/>{renderInput('SUNUM ÖDEVİ', 'sunum')}</View>
          <View style={{height: 16}}/>
          <View style={styles.simetricRow}>{renderInput('KANAAT NOTU', 'kanaat')}<View style={styles.gap16}/>{renderInput('ÖDEV', 'odev')}</View>
        </View>

        <View style={styles.simetricRow}>
          <View style={[styles.section, styles.flexItem, { backgroundColor: theme.card, borderColor: theme.border }]}>{renderInput('FİNAL', 'final')}</View>
          <View style={styles.gap16} />
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
          <TextInput 
            style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border, marginBottom: 16, textAlign: 'left' }]} 
            value={studentName} 
            onChangeText={setStudentName} 
            placeholder="ADINIZI GİRİNİZ" 
            placeholderTextColor={theme.textSecondary} 
          />
          <TextInput 
            style={[styles.fInputMultiline, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]} 
            placeholder="ÖNERİ, SORU VE ŞİKAYETLERİNİZİ BURAYA YAZABİLİRSİNİZ..." 
            placeholderTextColor={theme.textSecondary} 
            value={feedbackText} 
            onChangeText={setFeedbackText} 
            maxLength={500} 
            multiline={true}
          />
          <TouchableOpacity style={[styles.fSendBtn, {backgroundColor: theme.accent}]} onPress={handleSendFeedback}><Text style={styles.fSendBtnT}>MESAJI GÖNDER</Text></TouchableOpacity>
        </View>

        <Text style={styles.footerBrand}>Created by Alparslan Soyak</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, scroll: { padding: 16 },
  headerRowMobile: { alignItems: 'center', marginTop: 40, marginBottom: 40 },
  headerRowDesktop: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 40, marginBottom: 40, position: 'relative' },
  titleContainer: { alignItems: 'center' },
  title: { fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  subtitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  themeSelector: { flexDirection: 'row', gap: 8 },
  themeBox: { width: 36, height: 36, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  themeIcon: { fontSize: 16 },
  section: { borderRadius: 16, padding: 18, marginBottom: 24, borderWidth: 1 },
  label: { fontSize: 12, fontWeight: '800', marginBottom: 16, letterSpacing: 1 },
  simetricRow: { flexDirection: 'row', width: '100%' }, flexItem: { flex: 1 }, gap16: { width: 16 },
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
