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
  const [studentClassNum, setStudentClassNum] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('A');
  const [grades, setGrades] = useState({
    quiz: ['', '', '', ''], vize: ['', '', '', ''],
    writing: '', sunum: '', kanaat: '', odev: '', final: '', butunleme: '',
  });

  const [results, setResults] = useState(null);
  const [targetNote, setTargetNote] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');

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
        setStudentName(parsed.studentName || ''); setStudentClassNum(parsed.studentClassNum || '');
        if (parsed.activeTheme && THEMES[parsed.activeTheme]) setActiveTheme(parsed.activeTheme);
      }
    } catch (e) { console.error(e); } finally { setIsLoaded(true); }
  };

  const saveData = async () => {
    if (!isLoaded) return;
    try { await AsyncStorage.setItem('@ydy_data', JSON.stringify({ grades, selectedCourse, studentName, studentClassNum, activeTheme })); } catch (e) { console.error(e); }
  };

  useEffect(() => { if (isLoaded) { calculateGrade(); saveData(); } }, [grades, selectedCourse, studentName, studentClassNum, activeTheme]);

  const calculateGrade = () => {
    const qP = (grades.quiz.map(v => parseFloat(v) || 0).reduce((a, b) => a + b, 0) / 4 / 100) * 20;
    const vP = (grades.vize.map(v => parseFloat(v) || 0).reduce((a, b) => a + b, 0) / 4 / 100) * 60;
    const ort = qP + vP + (parseFloat(grades.writing) || 0)/20 + (parseFloat(grades.sunum) || 0)/20 + (parseFloat(grades.kanaat) || 0)/20 + (parseFloat(grades.odev) || 0)/20;
    const limit = selectedCourse === 'A' ? 84.5 : selectedCourse === 'B' ? 79.5 : 74.5;
    
    if (grades.final === '') {
      const needed = Math.ceil((65 - (ort * 0.4)) / 0.6);
      if (ort >= limit) setTargetNote({ type: 'pass', text: 'Geçmek için ortalaman yeterli!' });
      else if (needed <= 100) setTargetNote({ type: 'target', text: `Finalde gereken: ${needed}` });
      else setTargetNote({ type: 'fail', text: '100 alsan da geçilemiyor!' });
    } else { setTargetNote(null); }

    let res = { ortalama: ort.toFixed(2), durum: '', renk: '', fH: null, bH: null };
    if (ort >= limit) { res.durum = 'Geçtiniz ✓'; res.renk = theme.accent; }
    else if (grades.final === '') { res.durum = 'Finale Kaldınız'; res.renk = '#ef4444'; }
    else {
      const fS = (parseFloat(grades.final) * 0.6 + ort * 0.4).toFixed(2); res.fH = fS; 
      if (fS >= 64.5) { res.durum = 'Finalle Geçtiniz ✓'; res.renk = theme.accent; }
      else if (grades.butunleme === '') { res.durum = 'Bütünlemeye Kaldınız'; res.renk = '#ef4444'; }
      else {
        const bS = (parseFloat(grades.butunleme) * 0.6 + ort * 0.4).toFixed(2); res.bH = bS;
        const isP = bS >= 64.5; res.durum = isP ? 'Bütünleme ile Geçtiniz ✓' : 'Kaldınız ✗'; res.renk = isP ? theme.accent : '#ef4444';
      }
    }
    setResults(res);
  };

  const shareOnWhatsApp = () => {
    if (!results) return;
    let text = `🚀 YDY Sonucum:\n\nKur: ${selectedCourse}\nOrtalama: ${results.ortalama}\nDurum: ${results.durum}\n\nUygulama: ${window.location.href}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const handleSendFeedback = () => {
    if (!feedbackText.trim() || !window.gtag) return;
    const name = studentName.trim() || 'İsimsiz';
    const sSınıf = studentClassNum.trim() ? `${selectedCourse}${studentClassNum}` : 'Sınıf Belirtilmedi';
    const payload = `[${sSınıf}] ${name}: ${feedbackText.trim()}`;
    window.gtag('event', 'user_feedback_text', { 'event_category': 'Feedback', 'event_label': payload });
    alert('Mesajınız başarıyla iletildi!'); setFeedbackText(''); 
  };

  const renderInput = (label, field, index = null) => {
    const val = index !== null ? grades[field][index] : grades[field];
    return (
      <View style={styles.flexItem}>
        <Text style={[styles.iL, { color: theme.text }]}>{label}</Text>
        <TextInput style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: val !== '' && parseInt(val) > 100 ? '#ef4444' : theme.border }]} keyboardType="numeric" value={val} onChangeText={t => {
          const v = t === '' ? '' : t.replace(/[^0-9]/g, '');
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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        <View style={isMobile ? styles.headerRowMobile : styles.headerRowDesktop}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: theme.text, fontSize: isMobile ? 32 : 40 }]}>YDY</Text>
            <Text style={[styles.subtitle, { color: theme.accent }]}>Not Hesaplama</Text>
          </View>
          <View style={[styles.themeSelector, { marginTop: isMobile ? 16 : 0 }]}>
            {Object.values(THEMES).map(t => (
              <TouchableOpacity key={t.id} onPress={() => setActiveTheme(t.id)} style={[styles.themeBox, { backgroundColor: t.card, borderColor: activeTheme === t.id ? t.accent : t.border }]}>
                <Text style={styles.themeIcon}>{t.icon}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.accent }]}>KUR SEÇİMİ</Text>
          <View style={styles.simetricRow}>
            {['A', 'B', 'C'].map((k, i) => (
              <TouchableOpacity key={k} onPress={() => setSelectedCourse(k)} style={[styles.kurBtn, { backgroundColor: selectedCourse === k ? theme.accent : theme.bg, borderColor: theme.border, marginLeft: i === 0 ? 0 : 12 }]}>
                <Text style={[styles.kurBtnT, { color: selectedCourse === k ? '#fff' : theme.text }]}>{k} KURU</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.accent }]}>QUIZ NOTLARI</Text>
          <View style={styles.simetricRow}>
            {renderInput('Q1', 'quiz', 0)}<View style={styles.gap12}/>{renderInput('Q2', 'quiz', 1)}<View style={styles.gap12}/>
            {renderInput('Q3', 'quiz', 2)}<View style={styles.gap12}/>{renderInput('Q4', 'quiz', 3)}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.accent }]}>VİZE NOTLARI</Text>
          <View style={styles.simetricRow}>
            {renderInput('V1', 'vize', 0)}<View style={styles.gap12}/>{renderInput('V2', 'vize', 1)}<View style={styles.gap12}/>
            {renderInput('V3', 'vize', 2)}<View style={styles.gap12}/>{renderInput('V4', 'vize', 3)}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.accent }]}>PERFORMANS</Text>
          <View style={styles.simetricRow}>
            {renderInput('Writing', 'writing')}<View style={styles.gap12}/>{renderInput('Sunum', 'sunum')}
          </View>
          <View style={{height: 12}}/>
          <View style={styles.simetricRow}>
            {renderInput('Kanaat', 'kanaat')}<View style={styles.gap12}/>{renderInput('Ödev', 'odev')}
          </View>
        </View>

        <View style={styles.simetricRow}>
          <View style={[styles.section, styles.flexItem, { backgroundColor: theme.card, borderColor: theme.border }]}>{renderInput('FİNAL', 'final')}</View>
          <View style={styles.gap12} />
          <View style={[styles.section, styles.flexItem, { backgroundColor: theme.card, borderColor: theme.border }]}>{renderInput('BÜT', 'butunleme')}</View>
        </View>

        {results && (
          <View style={[styles.res, { borderTopColor: results.renk, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
            <Text style={[styles.resSt, { color: results.renk }]}>{results.durum}</Text>
            <Text style={[styles.resN, { color: theme.text }]}>Ortalama: {results.ortalama}</Text>
            {targetNote && <Text style={[styles.targetT, { color: targetNote.type === 'fail' ? '#ef4444' : theme.accent }]}>{targetNote.text}</Text>}
            <TouchableOpacity style={styles.resetBtn} onPress={() => setGrades({quiz:['','','',''],vize:['','','',''],writing:'',sunum:'',kanaat:'',odev:'',final:'',butunleme:''})}><Text style={styles.resetBtnT}>Sıfırla</Text></TouchableOpacity>
            <TouchableOpacity style={styles.waBtn} onPress={shareOnWhatsApp}><Text style={styles.waBtnT}>Paylaş</Text></TouchableOpacity>
          </View>
        )}

        <View style={[styles.feedbackCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.accent }]}>BİZE ULAŞIN</Text>
          <View style={[styles.simetricRow, {marginBottom: 12}]}>
            <View style={styles.flexItem}>
              <Text style={[styles.iL, { color: theme.textSecondary }]}>AD SOYAD</Text>
              <TextInput style={[styles.miniInput, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]} value={studentName} onChangeText={setStudentName} placeholder="Opsiyonel" placeholderTextColor={theme.textSecondary} />
            </View>
            <View style={{width: 12}}/>
            <View style={{width: 80}}>
              <Text style={[styles.iL, { color: theme.textSecondary }]}>SINIF</Text>
              <TextInput style={[styles.miniInput, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]} value={studentClassNum} onChangeText={t => setStudentClassNum(t.replace(/[^0-9]/g, '').slice(0, 2))} keyboardType="numeric" maxLength={2} placeholder="No" placeholderTextColor={theme.textSecondary} />
            </View>
          </View>
          <TextInput style={[styles.fInputMultiline, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]} placeholder="Soru, öneri ve şikayetlerinizi buraya yazabilirsiniz..." placeholderTextColor={theme.textSecondary} value={feedbackText} onChangeText={setFeedbackText} maxLength={500} multiline={true}/>
          <TouchableOpacity style={[styles.fSendBtn, {backgroundColor: theme.accent}]} onPress={handleSendFeedback}><Text style={styles.fSendBtnT}>Gönder</Text></TouchableOpacity>
        </View>

        <Text style={styles.footerBrand}>Created by Alparslan Soyak</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, scroll: { padding: 16 },
  headerRowMobile: { flexDirection: 'column', alignItems: 'center', marginTop: 40, marginBottom: 24 },
  headerRowDesktop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 30 },
  titleContainer: { alignItems: 'center' },
  title: { fontWeight: '900', letterSpacing: 2 },
  subtitle: { fontSize: 16, fontWeight: '700' },
  themeSelector: { flexDirection: 'row', gap: 8 },
  themeBox: { width: 36, height: 36, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  themeIcon: { fontSize: 16 },
  section: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
  label: { fontSize: 11, fontWeight: '800', marginBottom: 12, letterSpacing: 1 },
  simetricRow: { flexDirection: 'row', width: '100%' }, flexItem: { flex: 1 }, gap12: { width: 12 },
  kurBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  kurBtnT: { fontWeight: 'bold', fontSize: 13 },
  iL: { fontSize: 10, marginBottom: 4, fontWeight: '800' },
  input: { borderRadius: 8, padding: 10, borderWidth: 1, fontSize: 14, textAlign: 'center', minHeight: 44 },
  miniInput: { borderRadius: 8, padding: 8, borderWidth: 1, fontSize: 13, minHeight: 40 },
  res: { borderRadius: 20, padding: 20, borderTopWidth: 5, marginBottom: 40 },
  resSt: { fontWeight: 'bold', fontSize: 18, marginBottom: 2 },
  resN: { fontSize: 28, fontWeight: '900' },
  targetT: { fontSize: 13, marginTop: 8, fontWeight: '700' },
  resetBtn: { width: '100%', padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#ef4444', marginTop: 16 },
  resetBtnT: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  waBtn: { backgroundColor: '#25D366', marginTop: 8, padding: 14, borderRadius: 10, alignItems: 'center' },
  waBtnT: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  feedbackCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 30 },
  fInputMultiline: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 100, textAlignVertical: 'top', marginBottom: 12 },
  fSendBtn: { borderRadius: 10, padding: 14, alignItems: 'center' },
  fSendBtnT: { color: '#fff', fontWeight: 'bold' },
  footerBrand: { textAlign: 'center', color: '#64748b', fontSize: 14, fontWeight: '800', marginBottom: 20 }
});
