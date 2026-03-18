import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, TextInput, StyleSheet, Dimensions, Platform, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GA_TRACKING_ID = 'G-FD2290G3VG';

// MULTI-THEME SİSTEMİ
const THEMES = {
  dark: { id: 'dark', icon: '🌙', bg: '#0f172a', card: '#1e293b', text: '#ffffff', textSecondary: '#94a3b8', border: '#334155', accent: '#a855f7' },
  light: { id: 'light', icon: '☀️', bg: '#f8fafc', card: '#ffffff', text: '#1e293b', textSecondary: '#64748b', border: '#e2e8f0', accent: '#a855f7' },
  ocean: { id: 'ocean', icon: '🌊', bg: '#082f49', card: '#0c4a6e', text: '#f0f9ff', textSecondary: '#bae6fd', border: '#0284c7', accent: '#0ea5e9' },
  hacker: { id: 'hacker', icon: '💻', bg: '#000000', card: '#052e16', text: '#4ade80', textSecondary: '#22c55e', border: '#166534', accent: '#22c55e' }
};

export default function App() {
  const [activeTheme, setActiveTheme] = useState('dark');
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

  const theme = THEMES[activeTheme] || THEMES.dark;

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = "YDY Not Hesaplama - Alparslan Soyak";
      const metaTags = [
        { property: 'og:title', content: 'YDY Not Hesaplama Sistemi' },
        { property: 'og:description', content: 'Notlarını hesapla, finalde kaç alman gerektiğini öğren!' },
        { property: 'og:type', content: 'website' },
        { name: 'author', content: 'Alparslan Soyak' }
      ];
      metaTags.forEach(tag => { const m = document.createElement('meta'); Object.keys(tag).forEach(k => m.setAttribute(k, tag[k])); document.head.appendChild(m); });

      const script1 = document.createElement('script'); script1.async = true; script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`; document.head.appendChild(script1);
      const script2 = document.createElement('script'); script2.innerHTML = `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${GA_TRACKING_ID}');`; document.head.appendChild(script2);
    }
    loadSavedData();
  }, []);

  useEffect(() => { if (isLoaded) { calculateGrade(); saveData(); } }, [grades, selectedCourse, studentName, studentClassNum, activeTheme]);

  const saveData = async () => {
    try { await AsyncStorage.setItem('@ydy_data', JSON.stringify({ grades, selectedCourse, studentName, studentClassNum, activeTheme })); } catch (e) { console.error(e); }
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

  const calculateGrade = () => {
    const qP = (grades.quiz.map(v => parseFloat(v) || 0).reduce((a, b) => a + b, 0) / 4 / 100) * 20;
    const vP = (grades.vize.map(v => parseFloat(v) || 0).reduce((a, b) => a + b, 0) / 4 / 100) * 60;
    const wP = (parseFloat(grades.writing) || 0) / 100 * 5; const sP = (parseFloat(grades.sunum) || 0) / 100 * 5;
    const kP = (parseFloat(grades.kanaat) || 0) / 100 * 5; const oP = (parseFloat(grades.odev) || 0) / 100 * 5;

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
        res.durum = 'Geçtiniz ✓'; res.renk = theme.accent; 
        if (grades.final !== '') res.fH = (parseFloat(grades.final) * 0.6 + ort * 0.4).toFixed(2);
    }
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
    const tamSinifAd = studentClassNum ? `${selectedCourse}${studentClassNum}` : '';
    const kimlik = studentName ? `${studentName} - ` : '';
    let text = `🚀 ${kimlik}${tamSinifAd} YDY Sonucum:\n\nKur: ${selectedCourse}\nOrtalama: ${results.ortalama}\n`;
    if (grades.final !== '' && results.fH && grades.butunleme === '') text += `Yıl Sonu Notu: ${results.fH}\n`;
    if (grades.butunleme !== '' && results.bH) text += `Yıl Sonu Notu: ${results.bH}\n`;
    text += `Durum: ${results.durum}\n`;
    if (targetNote) text += `Hedef: ${targetNote.text}\n`;
    text += `\nUygulama: ${window.location.href}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const handleInputChange = (f, i, v) => {
    const val = v === '' ? '' : v.replace(/[^0-9]/g, '');
    if (Array.isArray(grades[f])) { const n = [...grades[f]]; n[i] = val; setGrades({ ...grades, [f]: n }); } 
    else { setGrades({ ...grades, [f]: val }); }
  };

  const isInvalid = (val) => val !== '' && (parseInt(val) > 100 || parseInt(val) < 0);

  const handleSendFeedback = () => {
    if (!feedbackText.trim() || !window.gtag) return;
    const payload = `[${selectedCourse}${studentClassNum}] ${studentName || 'İsimsiz'}: ${feedbackText.trim()}`;
    window.gtag('event', 'user_feedback_text', { 'event_category': 'Feedback', 'event_label': payload });
    alert('Mesajınız başarıyla iletildi!'); setFeedbackText(''); 
  };

  const renderInput = (label, field, index = null) => {
    const val = index !== null ? grades[field][index] : grades[field];
    return (
      <View style={styles.flexItem}>
        <Text style={[styles.iL, { color: theme.text }]}>{label}</Text>
        <TextInput 
          style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: isInvalid(val) ? '#ef4444' : theme.border }]} 
          keyboardType="numeric" value={val} onChangeText={t => handleInputChange(field, index, t)} maxLength={3} placeholder="0" placeholderTextColor={theme.textSecondary}
        />
        {isInvalid(val) && <Text style={styles.errT}>!</Text>}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={activeTheme === 'light' ? "dark" : "light"} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* KUSURSUZ MERKEZLENMİŞ BAŞLIK VE SAĞA YASLI TEMA BUTONLARI */}
        <View style={styles.headerContainer}>
          <View style={styles.titleCenter}>
            <Text style={[styles.title, { color: theme.text }]}>YDY</Text>
            <Text style={[styles.subtitle, { color: theme.accent }]}>Not Hesaplama Sistemi</Text>
          </View>
          <View style={styles.themeSelector}>
            {Object.values(THEMES).map(t => (
              <TouchableOpacity key={t.id} onPress={() => setActiveTheme(t.id)} 
                style={[styles.themeBox, { backgroundColor: t.card, borderColor: activeTheme === t.id ? t.accent : t.border }]}>
                <Text style={styles.themeIcon}>{t.icon}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.accent }]}>KUR SEÇİMİ</Text>
          <View style={styles.simetricRow}>
            {['A', 'B', 'C'].map((k, i) => (
              <React.Fragment key={k}>
                <TouchableOpacity onPress={() => setSelectedCourse(k)} 
                  style={[styles.btn, { backgroundColor: selectedCourse === k ? theme.accent : theme.bg, borderColor: theme.border }]}>
                  <Text style={[styles.btnT, { color: selectedCourse === k ? '#fff' : theme.text }]}>{k} KURU</Text>
                </TouchableOpacity>
                {i !== 2 && <View style={styles.gap16} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.accent }]}>ÖĞRENCİ BİLGİLERİ</Text>
          <View style={styles.simetricRow}>
            <View style={styles.flexItem}>
              <Text style={[styles.iL, { color: theme.text }]}>Ad Soyad</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]} value={studentName} onChangeText={setStudentName} placeholder="Ali Yılmaz" placeholderTextColor={theme.textSecondary}/>
            </View>
            <View style={styles.gap16} /> 
            <View style={styles.flexItem}>
              <Text style={[styles.iL, { color: theme.text }]}>Sınıf (Örn: {selectedCourse}12)</Text>
              <View style={[styles.classBox, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                <Text style={[styles.prefix, { color: theme.text, borderRightColor: theme.border }]}>{selectedCourse}</Text>
                <TextInput style={[styles.inputNoBorder, { color: theme.text }]} value={studentClassNum} onChangeText={t => setStudentClassNum(t.replace(/[^0-9]/g, '').slice(0, 2))} placeholder="12" placeholderTextColor={theme.textSecondary} keyboardType="numeric"/>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.accent }]}>QUIZ NOTLARI</Text>
          <View style={styles.simetricRow}>
            <View style={styles.flexItem}><View style={styles.simetricRow}>{renderInput('Q1', 'quiz', 0)}<View style={styles.gap12} />{renderInput('Q2', 'quiz', 1)}</View></View>
            <View style={styles.gap16} /> 
            <View style={styles.flexItem}><View style={styles.simetricRow}>{renderInput('Q3', 'quiz', 2)}<View style={styles.gap12} />{renderInput('Q4', 'quiz', 3)}</View></View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.accent }]}>VİZE NOTLARI</Text>
          <View style={styles.simetricRow}>
            <View style={styles.flexItem}><View style={styles.simetricRow}>{renderInput('V1', 'vize', 0)}<View style={styles.gap12} />{renderInput('V2', 'vize', 1)}</View></View>
            <View style={styles.gap16} /> 
            <View style={styles.flexItem}><View style={styles.simetricRow}>{renderInput('V3', 'vize', 2)}<View style={styles.gap12} />{renderInput('V4', 'vize', 3)}</View></View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.accent }]}>DİĞER NOTLAR</Text>
          <View style={styles.simetricRow}>
            {renderInput('Writing', 'writing')} <View style={styles.gap16} /> {renderInput('Sunum', 'sunum')}
          </View>
          <View style={{height: 16}}/> 
          <View style={styles.simetricRow}>
            {renderInput('Kanaat', 'kanaat')} <View style={styles.gap16} /> {renderInput('Ödev', 'odev')}
          </View>
        </View>

        <View style={styles.simetricRow}>
          <View style={[styles.section, styles.flexItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
             {renderInput('FİNAL', 'final')}
          </View>
          <View style={styles.gap16} /> 
          <View style={[styles.section, styles.flexItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
             {renderInput('BÜTÜNLEME', 'butunleme')}
          </View>
        </View>

        {results && (
          <View style={[styles.res, { borderTopColor: results.renk, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
            <Text style={[styles.resSt, { color: results.renk }]}>{results.durum}</Text>
            <Text style={[styles.resN, { color: theme.text }]}>Ort: {results.ortalama}</Text>
            {results.fH && <Text style={[styles.detailT, {color: theme.textSecondary}]}>Yıl Sonu: {results.fH}</Text>}
            {targetNote && <Text style={[styles.targetT, { color: targetNote.type === 'fail' ? '#ef4444' : theme.accent }]}>{targetNote.text}</Text>}
            
            <TouchableOpacity style={styles.waBtn} onPress={shareOnWhatsApp}>
              <Text style={styles.waBtnT}>WhatsApp ile Paylaş</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.reset} onPress={() => setGrades({quiz:['','','',''],vize:['','','',''],writing:'',sunum:'',kanaat:'',odev:'',final:'',butunleme:''})}><Text style={styles.resetT}>Tüm Notları Sıfırla</Text></TouchableOpacity>
        <View style={{ height: 280 }} /> 
      </ScrollView>

      <View style={[styles.footerContainer, { backgroundColor: theme.card, borderTopColor: theme.accent }]}>
        <Text style={[styles.feedbackTitle, {color: theme.text}]}>Öneri veya sorunlarınızı paylaşın:</Text>
        <View style={styles.feedbackRow}>
          <TextInput style={[styles.fInput, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]} placeholder="Mesajınız..." placeholderTextColor={theme.textSecondary} value={feedbackText} onChangeText={setFeedbackText} multiline numberOfLines={3}/>
          <TouchableOpacity style={[styles.fSendBtn, {backgroundColor: theme.accent}]} onPress={handleSendFeedback}><Text style={styles.fSendBtnT}>Gönder</Text></TouchableOpacity>
        </View>
        <Text style={styles.footerBrand}>Created by Alparslan Soyak</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16 },
  
  /* BAŞLIK MERKEZLEME VE İKONLAR İÇİN YENİ MİMARİ */
  headerContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end', // İkonları en sağa yaslar
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
    height: 80, // Absolute elemanlar için yükseklik referansı
    position: 'relative',
  },
  titleCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center', // Başlığı tam ekran ortasına çiviler
    zIndex: -1, // İkonların tıklanabilirliğini engellememesi için
  },
  title: { fontSize: 48, fontWeight: 'bold', letterSpacing: 2, textAlign: 'center' },
  subtitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  
  themeSelector: { flexDirection: 'row', gap: 8, zIndex: 10 },
  themeBox: { width: 36, height: 36, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  themeIcon: { fontSize: 16 },

  section: { borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1 },
  simetricRow: { flexDirection: 'row', width: '100%' },
  flexItem: { flex: 1 },
  gap16: { width: 16 }, 
  gap12: { width: 12 }, 
  
  label: { fontSize: 12, fontWeight: '800', marginBottom: 14, letterSpacing: 1 },
  iL: { fontSize: 12, marginBottom: 6, fontWeight: '600', textTransform: 'uppercase' },
  
  input: { borderRadius: 10, padding: 14, borderWidth: 1, fontSize: 15, minHeight: 50 },
  errT: { color: '#ef4444', fontSize: 10, marginTop: 4, fontWeight: 'bold', position: 'absolute', bottom: -16 },
  
  btn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  btnT: { fontWeight: 'bold', fontSize: 13 },
  
  classBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, height: 50 },
  prefix: { paddingHorizontal: 12, fontWeight: 'bold', borderRightWidth: 1 },
  inputNoBorder: { flex: 1, paddingHorizontal: 10, fontSize: 15 },
  
  res: { borderRadius: 20, padding: 24, borderTopWidth: 5, marginTop: 4 },
  resSt: { fontWeight: 'bold', fontSize: 20, marginBottom: 4 },
  resN: { fontSize: 32, fontWeight: '900' },
  detailT: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  targetT: { fontSize: 14, marginTop: 12, fontWeight: '700' },
  
  waBtn: { backgroundColor: '#25D366', marginTop: 24, padding: 16, borderRadius: 10, alignItems: 'center' },
  waBtnT: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  
  reset: { marginTop: 20, padding: 10, alignItems: 'center' },
  resetT: { color: '#ef4444', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  
  footerContainer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, elevation: 10, borderTopWidth: 2 },
  feedbackTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  feedbackRow: { flexDirection: 'row', gap: 10 },
  fInput: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1, fontSize: 14, height: 80, textAlignVertical: 'top' },
  fSendBtn: { paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center' },
  fSendBtnT: { color: '#fff', fontWeight: 'bold' },
  footerBrand: { textAlign: 'center', marginTop: 15, color: '#64748b', fontSize: 16, fontWeight: '800', letterSpacing: 1.5 }
});
