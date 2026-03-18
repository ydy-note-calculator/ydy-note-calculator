import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, TextInput, StyleSheet, Dimensions, Platform, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GA_TRACKING_ID = 'G-FD2290G3VG';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [studentName, setStudentName] = useState('');
  const [studentClassNum, setStudentClassNum] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('A');
  const [grades, setGrades] = useState({
    quiz: ['', '', '', ''], vize: ['', '', '', ''],
    writing: '', sunum: '', kanaat: '', odev: '', final: '', butunleme: '',
  });

  const [results, setResults] = useState(null);
  const [targetNote, setTargetNote] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const theme = isDarkMode ? darkTheme : lightTheme;

  useEffect(() => {
    if (Platform.OS === 'web') {
      // META TAGS & SEO (WhatsApp Görünümü İçin)
      document.title = "YDY Not Hesaplama - Alparslan Soyak";
      const metaTags = [
        { property: 'og:title', content: 'YDY Not Hesaplama Sistemi' },
        { property: 'og:description', content: 'Notlarını hesapla, finalde kaç alman gerektiğini öğren!' },
        { property: 'og:type', content: 'website' },
        { name: 'author', content: 'Alparslan Soyak' }
      ];
      metaTags.forEach(tag => {
        const m = document.createElement('meta');
        Object.keys(tag).forEach(key => m.setAttribute(key, tag[key]));
        document.head.appendChild(m);
      });

      // GOOGLE ANALYTICS
      const script1 = document.createElement('script');
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
      document.head.appendChild(script1);
      const script2 = document.createElement('script');
      script2.innerHTML = `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${GA_TRACKING_ID}');`;
      document.head.appendChild(script2);
    }
    loadSavedData();
  }, []);

  useEffect(() => { if (isLoaded) { calculateGrade(); saveData(); } }, [grades, selectedCourse, studentName, studentClassNum]);

  const saveData = async () => {
    try { await AsyncStorage.setItem('@ydy_data', JSON.stringify({ grades, selectedCourse, studentName, studentClassNum, isDarkMode })); } catch (e) { console.error(e); }
  };

  const loadSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('@ydy_data');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setGrades(parsed.grades || grades);
        setSelectedCourse(parsed.selectedCourse || 'A');
        setStudentName(parsed.studentName || '');
        setStudentClassNum(parsed.studentClassNum || '');
        setIsDarkMode(parsed.isDarkMode !== undefined ? parsed.isDarkMode : true);
      }
    } catch (e) { console.error(e); } finally { setIsLoaded(true); }
  };

  const calculateGrade = () => {
    const qP = (grades.quiz.map(v => parseFloat(v) || 0).reduce((a, b) => a + b, 0) / 4 / 100) * 20;
    const vP = (grades.vize.map(v => parseFloat(v) || 0).reduce((a, b) => a + b, 0) / 4 / 100) * 60;
    const wP = (parseFloat(grades.writing) || 0) / 100 * 5;
    const sP = (parseFloat(grades.sunum) || 0) / 100 * 5;
    const kP = (parseFloat(grades.kanaat) || 0) / 100 * 5;
    const oP = (parseFloat(grades.odev) || 0) / 100 * 5;

    const ort = qP + vP + wP + sP + kP + oP;
    const limit = selectedCourse === 'A' ? 84.5 : selectedCourse === 'B' ? 79.5 : 74.5;
    
    if (grades.final === '') {
      const needed = Math.ceil((65 - (ort * 0.4)) / 0.6);
      if (ort >= limit) setTargetNote({ type: 'pass', text: 'Geçmek için ortalaman yeterli!' });
      else if (needed <= 100) setTargetNote({ type: 'target', text: `Finalde gereken: ${needed}` });
      else setTargetNote({ type: 'fail', text: '100 alsan da geçilemiyor!' });
    } else { setTargetNote(null); }

    let res = { ortalama: ort.toFixed(2), durum: '', renk: '', fH: null, bH: null };
    if (ort >= limit) { 
        res.durum = 'Geçtiniz ✓'; res.renk = '#10b981'; 
        if (grades.final !== '') res.fH = (parseFloat(grades.final) * 0.6 + ort * 0.4).toFixed(2);
    }
    else if (grades.final === '') { res.durum = 'Finale Kaldınız'; res.renk = '#ef4444'; }
    else {
      const fS = (parseFloat(grades.final) * 0.6 + ort * 0.4).toFixed(2);
      res.fH = fS; 
      if (fS >= 64.5) { res.durum = 'Finalle Geçtiniz ✓'; res.renk = '#10b981'; }
      else if (grades.butunleme === '') { res.durum = 'Bütünlemeye Kaldınız'; res.renk = '#ef4444'; }
      else {
        const bS = (parseFloat(grades.butunleme) * 0.6 + ort * 0.4).toFixed(2);
        res.bH = bS;
        const isP = bS >= 64.5;
        res.durum = isP ? 'Bütünleme ile Geçtiniz ✓' : 'Kaldınız ✗';
        res.renk = isP ? '#10b981' : '#ef4444';
      }
    }
    setResults(res);
  };

  const handleInputChange = (f, i, v) => {
    const val = v === '' ? '' : v.replace(/[^0-9]/g, '');
    if (Array.isArray(grades[f])) {
      const n = [...grades[f]]; n[i] = val; setGrades({ ...grades, [f]: n });
    } else { setGrades({ ...grades, [f]: val }); }
  };

  const isInvalid = (val) => val !== '' && (parseInt(val) > 100 || parseInt(val) < 0);

  const handleSendFeedback = () => {
    if (!feedbackText.trim() || !window.gtag) return;
    const payload = `[${selectedCourse}${studentClassNum}] ${studentName || 'İsimsiz'}: ${feedbackText.trim()}`;
    window.gtag('event', 'user_feedback_text', { 'event_category': 'Feedback', 'event_label': payload });
    alert('Mesajınız başarıyla iletildi!'); setFeedbackText(''); 
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* HEADER & THEME TOGGLE */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>YDY</Text>
            <Text style={styles.subtitle}>Not Hesaplama Sistemi</Text>
          </View>
          <TouchableOpacity onPress={() => setIsDarkMode(!isDarkMode)} style={styles.themeBtn}>
            <Text style={{fontSize: 24}}>{isDarkMode ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </View>

        {/* KUR SEÇİMİ */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={styles.label}>KUR SEÇİMİ</Text>
          <View style={styles.row}>
            {['A', 'B', 'C'].map(k => (
              <TouchableOpacity key={k} onPress={() => setSelectedCourse(k)} style={[styles.btn, selectedCourse === k ? styles.btnActive : {backgroundColor: theme.bg}]}>
                <Text style={styles.btnT}>{k} KURU</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ÖĞRENCİ BİLGİLERİ (SİMETRİK) */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={styles.label}>ÖĞRENCİ BİLGİLERİ</Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={[styles.iL, { color: theme.text }]}>Ad Soyad</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]} value={studentName} onChangeText={setStudentName} placeholder="Ali Yılmaz" placeholderTextColor="#64748b"/>
            </View>
            <View style={styles.flex}>
              <Text style={[styles.iL, { color: theme.text }]}>Sınıf</Text>
              <View style={[styles.classBox, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                <Text style={[styles.prefix, { color: theme.text }]}>{selectedCourse}</Text>
                <TextInput style={[styles.inputNoBorder, { color: theme.text }]} value={studentClassNum} onChangeText={t => setStudentClassNum(t.replace(/[^0-9]/g, '').slice(0, 2))} placeholder="12" placeholderTextColor="#64748b" keyboardType="numeric"/>
              </View>
            </View>
          </View>
        </View>

        {/* NOT GİRİŞLERİ - GENEL ŞABLON */}
        {[ 
          { l: 'QUIZ NOTLARI', f: 'quiz' }, 
          { l: 'VİZE NOTLARI', f: 'vize' } 
        ].map(s => (
          <View key={s.f} style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={styles.label}>{s.l}</Text>
            <View style={styles.grid}>
              {grades[s.f].map((v, i) => (
                <View key={i} style={styles.gridItem}>
                  <Text style={[styles.iL, { color: theme.text }]}>{s.f === 'quiz' ? 'Q' : 'V'}{i+1}</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: isInvalid(v) ? '#ef4444' : theme.border }]} keyboardType="numeric" value={v} onChangeText={t => handleInputChange(s.f, i, t)} maxLength={3}/>
                  {isInvalid(v) && <Text style={styles.errT}>!</Text>}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* DİĞER NOTLAR (SİMETRİ AYARI) */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={styles.label}>DİĞER NOTLAR</Text>
          <View style={styles.grid}>
            {[ {k:'writing', l:'Writing'}, {k:'sunum', l:'Sunum'}, {k:'kanaat', l:'Kanaat'}, {k:'odev', l:'Ödev'} ].map(i => (
              <View key={i.k} style={styles.gridItemHalf}>
                <Text style={[styles.iL, { color: theme.text }]}>{i.l}</Text>
                <TextInput style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: isInvalid(grades[i.k]) ? '#ef4444' : theme.border }]} keyboardType="numeric" value={grades[i.k]} onChangeText={t => handleInputChange(i.k, null, t)} maxLength={3}/>
                {isInvalid(grades[i.k]) && <Text style={styles.errT}>0-100 giriniz</Text>}
              </View>
            ))}
          </View>
        </View>

        {/* FİNAL / BÜTÜNLEME (SİMETRİ AYARI) */}
        <View style={styles.row}>
          <View style={[styles.section, styles.flex, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={styles.label}>FİNAL</Text>
            <TextInput style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: isInvalid(grades.final) ? '#ef4444' : theme.border }]} value={grades.final} onChangeText={t => handleInputChange('final', null, t)} maxLength={3} keyboardType="numeric"/>
          </View>
          <View style={[styles.section, styles.flex, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={styles.label}>BÜTÜNLEME</Text>
            <TextInput style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: isInvalid(grades.butunleme) ? '#ef4444' : theme.border }]} value={grades.butunleme} onChangeText={t => handleInputChange('butunleme', null, t)} maxLength={3} keyboardType="numeric"/>
          </View>
        </View>

        {results && (
          <View style={[styles.res, { borderTopColor: results.renk, backgroundColor: theme.card }]}>
            <Text style={[styles.resSt, { color: results.renk }]}>{results.durum}</Text>
            <Text style={[styles.resN, { color: theme.text }]}>Ort: {results.ortalama}</Text>
            {results.fH && <Text style={[styles.detailT, {color: theme.textSecondary}]}>Yıl Sonu: {results.fH}</Text>}
            {targetNote && <Text style={[styles.targetT, { color: targetNote.type === 'fail' ? '#ef4444' : '#a855f7' }]}>{targetNote.text}</Text>}
          </View>
        )}

        <TouchableOpacity style={styles.reset} onPress={() => setGrades({quiz:['','','',''],vize:['','','',''],writing:'',sunum:'',kanaat:'',odev:'',final:'',butunleme:''})}><Text style={styles.resetT}>Tüm Notları Sıfırla</Text></TouchableOpacity>
        
        <View style={{ height: 280 }} /> 
      </ScrollView>

      {/* FEEDBACK & FOOTER (STAY AT BOTTOM) */}
      <View style={[styles.footerContainer, { backgroundColor: theme.card, borderTopColor: theme.accent }]}>
        <Text style={[styles.feedbackTitle, {color: theme.text}]}>Öneri veya sorunlarınızı paylaşın:</Text>
        <View style={styles.feedbackRow}>
          <TextInput style={[styles.fInput, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]} placeholder="Mesajınız..." placeholderTextColor="#64748b" value={feedbackText} onChangeText={setFeedbackText} multiline numberOfLines={3}/>
          <TouchableOpacity style={styles.fSendBtn} onPress={handleSendFeedback}><Text style={styles.fSendBtnT}>Gönder</Text></TouchableOpacity>
        </View>
        <Text style={styles.footerBrand}>Created by Alparslan Soyak</Text>
      </View>
    </View>
  );
}

const lightTheme = { bg: '#f8fafc', card: '#ffffff', text: '#1e293b', textSecondary: '#64748b', border: '#e2e8f0', accent: '#a855f7' };
const darkTheme = { bg: '#0f172a', card: '#1e293b', text: '#ffffff', textSecondary: '#94a3b8', border: '#334155', accent: '#a855f7' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 30 },
  title: { fontSize: 48, fontWeight: 'bold', letterSpacing: 2 },
  subtitle: { color: '#a855f7', fontSize: 18, fontWeight: '700' },
  themeBtn: { padding: 10, borderRadius: 12, backgroundColor: 'rgba(168, 85, 247, 0.1)' },
  section: { borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1 },
  label: { color: '#a855f7', fontSize: 12, fontWeight: '800', marginBottom: 14, letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: '22.5%' },
  gridItemHalf: { width: '47.8%' },
  flex: { flex: 1 },
  iL: { fontSize: 12, marginBottom: 6, fontWeight: '600' },
  input: { borderRadius: 10, padding: 14, borderWidth: 1, fontSize: 15 },
  errT: { color: '#ef4444', fontSize: 10, marginTop: 4, fontWeight: 'bold' },
  btn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  btnActive: { backgroundColor: '#a855f7' },
  btnT: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  classBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, height: 50 },
  prefix: { paddingHorizontal: 12, fontWeight: 'bold', borderRightWidth: 1, borderRightColor: '#334155' },
  inputNoBorder: { flex: 1, paddingHorizontal: 10, fontSize: 15 },
  res: { borderRadius: 20, padding: 24, borderTopWidth: 5, marginTop: 10 },
  resSt: { fontWeight: 'bold', fontSize: 20, marginBottom: 4 },
  resN: { fontSize: 32, fontWeight: '900' },
  detailT: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  targetT: { fontSize: 14, marginTop: 12, fontWeight: '700' },
  reset: { marginTop: 20, padding: 10, alignItems: 'center' },
  resetT: { color: '#ef4444', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  footerContainer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, elevation: 10 },
  feedbackTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  feedbackRow: { flexDirection: 'row', gap: 10 },
  fInput: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1, fontSize: 14, height: 80, textAlignVertical: 'top' },
  fSendBtn: { backgroundColor: '#a855f7', paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center' },
  fSendBtnT: { color: '#fff', fontWeight: 'bold' },
  footerBrand: { textAlign: 'center', marginTop: 15, color: '#64748b', fontSize: 16, fontWeight: '800', letterSpacing: 1.5 }
});
