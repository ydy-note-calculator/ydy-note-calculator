import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, TextInput, StyleSheet, Dimensions, Platform, Linking, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GA_TRACKING_ID = 'G-FD2290G3VG';

// MULTI-THEME SİSTEMİ
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
  const [isEntered, setIsEntered] = useState(false); 
  
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
  const [feedbackText, setFeedbackText] = useState('');

  const theme = THEMES[activeTheme] || THEMES.dark;

  useEffect(() => {
    if (Platform.OS === 'web') {
      // META TAGS & SEO
      document.title = "YDY Not Hesaplama - Alparslan Soyak";
      const metaTags = [
        { property: 'og:title', content: 'YDY Not Hesaplama Sistemi' },
        { property: 'og:description', content: 'Notlarını hesapla, finalde kaç alman gerektiğini öğren!' },
        { property: 'og:type', content: 'website' },
        { name: 'author', content: 'Alparslan Soyak' }
      ];
      metaTags.forEach(tag => { const m = document.createElement('meta'); Object.keys(tag).forEach(k => m.setAttribute(k, tag[k])); document.head.appendChild(m); });

      // GOOGLE ANALYTICS
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
    if (ort >= limit) { res.durum = 'Geçtiniz ✓'; res.renk = theme.accent; if (grades.final !== '') res.fH = (parseFloat(grades.final) * 0.6 + ort * 0.4).toFixed(2); }
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

  const handleLogin = () => {
    if(!studentName.trim() || !studentClassNum.trim()) {
      alert("Lütfen adınızı ve sınıf numaranızı giriniz.");
      return;
    }
    setIsEntered(true);
  };

  const handleLogout = () => { setIsEntered(false); };

  const shareOnWhatsApp = () => {
    if (!results) return;
    let text = `🚀 ${studentName} - ${selectedCourse}${studentClassNum} YDY Sonucum:\n\nKur: ${selectedCourse}\nOrtalama: ${results.ortalama}\n`;
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
        <TextInput style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: isInvalid(val) ? '#ef4444' : theme.border }]} keyboardType="numeric" value={val} onChangeText={t => handleInputChange(field, index, t)} maxLength={3} placeholder="0" placeholderTextColor={theme.textSecondary}/>
        {isInvalid(val) && <Text style={styles.errT}>!</Text>}
      </View>
    );
  };

  if (!isLoaded) return null;

  // ==========================================
  // 1. KATMAN: GİRİŞ (PORTAL) EKRANI
  // ==========================================
  if (!isEntered) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, justifyContent: 'center', padding: 20 }]}>
        <StatusBar style={activeTheme === 'light' ? "dark" : "light"} />
        
        <View style={{flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 20}}>
          {Object.values(THEMES).map(t => (
            <TouchableOpacity key={t.id} onPress={() => setActiveTheme(t.id)} style={[styles.themeBox, { backgroundColor: t.card, borderColor: activeTheme === t.id ? t.accent : t.border }]}>
              <Text style={styles.themeIcon}>{t.icon}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.loginCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.loginTitle, { color: theme.text }]}>YDY</Text>
          <Text style={[styles.loginSubtitle, { color: theme.accent }]}>Not Hesaplama Sistemi</Text>

          <Text style={[styles.label, { color: theme.accent, marginTop: 40 }]}>KİMLİK BİLGİLERİ</Text>
          <Text style={[styles.iL, { color: theme.text }]}>AD SOYAD</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border, marginBottom: 16 }]} value={studentName} onChangeText={setStudentName} placeholder="Örn: Alparslan Soyak" placeholderTextColor={theme.textSecondary}/>
          
          <Text style={[styles.iL, { color: theme.text }]}>SINIF NUMARASI</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border, marginBottom: 30 }]} value={studentClassNum} onChangeText={t => setStudentClassNum(t.replace(/[^0-9]/g, '').slice(0, 2))} placeholder="Örn: 12" placeholderTextColor={theme.textSecondary} keyboardType="numeric" maxLength={2}/>

          <TouchableOpacity style={[styles.loginBtn, {backgroundColor: theme.accent}]} onPress={handleLogin}>
            <Text style={styles.loginBtnT}>Sisteme Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ==========================================
  // 2. KATMAN: ANA HESAPLAMA EKRANI
  // ==========================================
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={activeTheme === 'light' ? "dark" : "light"} />
      
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* MOBİL UYUMLU DİNAMİK BAŞLIK VE TEMA SEÇİCİ */}
        <View style={isMobile ? styles.headerRowMobile : styles.headerRowDesktop}>
          <View style={styles.titleCenter}>
            <Text style={[styles.title, { color: theme.text, fontSize: isMobile ? 40 : 48 }]}>YDY</Text>
            <Text style={[styles.subtitle, { color: theme.accent }]}>Not Hesaplama Sistemi</Text>
          </View>
          
          <View style={styles.themeSelector}>
            {Object.values(THEMES).map(t => (
              <TouchableOpacity key={t.id} onPress={() => setActiveTheme(t.id)} style={[styles.themeBox, { backgroundColor: t.card, borderColor: activeTheme === t.id ? t.accent : t.border }]}>
                <Text style={styles.themeIcon}>{t.icon}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* PARANTEZSİZ, - İLE AYRILMIŞ HOŞ GELDİN PANELİ */}
        <View style={[styles.welcomePanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View>
            <Text style={[styles.welcomeText, { color: theme.textSecondary }]}>Hoş geldin,</Text>
            <Text style={[styles.welcomeName, { color: theme.text }]}>{studentName} <Text style={{color: theme.accent}}>- {selectedCourse}{studentClassNum}</Text></Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={[styles.editBtn, {borderColor: theme.border, backgroundColor: theme.bg}]}>
            <Text style={{fontSize: 18}}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* KUR SEÇİMİ İKİNCİ EKRANDA */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.accent }]}>KUR SEÇİMİ</Text>
          <View style={styles.simetricRow}>
            {['A', 'B', 'C'].map((k, i) => (
              <React.Fragment key={k}>
                <TouchableOpacity onPress={() => setSelectedCourse(k)} style={[styles.btn, { backgroundColor: selectedCourse === k ? theme.accent : theme.bg, borderColor: theme.border }]}>
                  <Text style={[styles.btnT, { color: selectedCourse === k ? '#fff' : theme.text }]}>{k} KURU</Text>
                </TouchableOpacity>
                {i !== 2 && <View style={styles.gap16} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* QUIZ NOTLARI (4'LÜ KUSURSUZ SİMETRİ) */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.accent }]}>QUIZ NOTLARI</Text>
          <View style={styles.simetricRow}>
            <View style={styles.flexItem}><View style={styles.simetricRow}>{renderInput('Quiz 1', 'quiz', 0)}<View style={styles.gap12} />{renderInput('Quiz 2', 'quiz', 1)}</View></View>
            <View style={styles.gap16} /> 
            <View style={styles.flexItem}><View style={styles.simetricRow}>{renderInput('Quiz 3', 'quiz', 2)}<View style={styles.gap12} />{renderInput('Quiz 4', 'quiz', 3)}</View></View>
          </View>
        </View>

        {/* VİZE NOTLARI (4'LÜ KUSURSUZ SİMETRİ) */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.accent }]}>VİZE NOTLARI</Text>
          <View style={styles.simetricRow}>
            <View style={styles.flexItem}><View style={styles.simetricRow}>{renderInput('Vize 1', 'vize', 0)}<View style={styles.gap12} />{renderInput('Vize 2', 'vize', 1)}</View></View>
            <View style={styles.gap16} /> 
            <View style={styles.flexItem}><View style={styles.simetricRow}>{renderInput('Vize 3', 'vize', 2)}<View style={styles.gap12} />{renderInput('Vize 4', 'vize', 3)}</View></View>
          </View>
        </View>

        {/* DİĞER NOTLAR (2X2 KUSURSUZ SİMETRİ) */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.accent }]}>DİĞER NOTLAR</Text>
          <View style={styles.simetricRow}>
            {renderInput('Writing', 'writing')} <View style={styles.gap16} /> {renderInput('Sunum', 'sunum')}
          </View>
          <View style={{height: 16}}/> 
          <View style={styles.simetricRow}>
            {/* ETİKETLER GÜNCELLENDİ (Kanaat Notu, Online Ödev) */}
            {renderInput('Kanaat Notu', 'kanaat')} <View style={styles.gap16} /> {renderInput('Online Ödev', 'odev')}
          </View>
        </View>

        {/* FİNAL / BÜTÜNLEME */}
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
            <Text style={[styles.resN, { color: theme.text }]}>Ortalama: {results.ortalama}</Text>
            {results.fH && <Text style={[styles.detailT, {color: theme.textSecondary}]}>Yıl Sonu: {results.fH}</Text>}
            {targetNote && <Text style={[styles.targetT, { color: targetNote.type === 'fail' ? '#ef4444' : theme.accent }]}>{targetNote.text}</Text>}
            
            <TouchableOpacity style={styles.waBtn} onPress={shareOnWhatsApp}>
              <Text style={styles.waBtnT}>WhatsApp ile Paylaş</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.reset} onPress={() => setGrades({quiz:['','','',''],vize:['','','',''],writing:'',sunum:'',kanaat:'',odev:'',final:'',butunleme:''})}>
          <Text style={styles.resetT}>Tüm Notları Sıfırla</Text>
        </TouchableOpacity>

        {/* İŞTE ÇÖZÜM: 40 piksellik görünmez kalkan eklendi */}
        <View style={styles.spacer} /> 
      </ScrollView>

      {/* --- ALT PANEL: GERİ BİLDİRİM VE BAĞIMSIZ İMZA --- */}
      <View style={[styles.footerPanel, { backgroundColor: theme.card, borderTopColor: theme.accent }]}>
        <Text style={[styles.feedbackTitle, {color: theme.text}]}>Öneri veya sorunlarınızı paylaşın:</Text>
        <View style={styles.feedbackRow}>
          <TextInput 
            style={[styles.fInputMultiline, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]} 
            placeholder="Mesajınız..." 
            placeholderTextColor={theme.textSecondary}
            value={feedbackText}
            onChangeText={setFeedbackText}
            maxLength={500}
            multiline={true}
          />
          <TouchableOpacity style={[styles.fSendBtn, {backgroundColor: theme.accent}]} onPress={handleSendFeedback}>
            <Text style={styles.fSendBtnT}>Gönder</Text>
          </TouchableOpacity>
        </View>
        
        {/* İMZA ARTIK MESAJ KUTUSUNUN DIŞINDA VE BAĞIMSIZ */}
        <Text style={styles.footerBrand}>Created by Alparslan Soyak</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // ScrollView'un sonuna boşluk eklendi (spacer için)
  scroll: { padding: 16, paddingBottom: 40 },
  
  // DİNAMİK BAŞLIK STİLLERİ
  headerRowMobile: { width: '100%', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginTop: 40, marginBottom: 40, position: 'relative', gap: 15 },
  headerRowDesktop: { width: '100%', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 40, marginBottom: 30, height: 100, position: 'relative' },
  
  titleCenter: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: -1 },
  title: { fontWeight: 'bold', letterSpacing: 2, textAlign: 'center', lineHeight: 50 },
  subtitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  
  themeSelector: { flexDirection: 'row', gap: 8, zIndex: 10 },
  themeBox: { width: 36, height: 36, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  themeIcon: { fontSize: 16 },

  loginCard: { width: '100%', maxWidth: 500, alignSelf: 'center', padding: 30, borderRadius: 24, borderWidth: 1, elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 15 },
  loginTitle: { fontSize: 56, fontWeight: '900', textAlign: 'center', letterSpacing: 3 },
  loginSubtitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  loginBtn: { padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  loginBtnT: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },

  welcomePanel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  welcomeText: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  welcomeName: { fontSize: 18, fontWeight: 'bold' },
  editBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  // Kutucuklar arasındaki boşluk artırıldı (marginBottom: 24)
  section: { borderRadius: 16, padding: 18, marginBottom: 24, borderWidth: 1 },
  
  // SİMETRİ İÇİN DİKEY GAP (gap16)
  simetricRow: { flexDirection: 'row', width: '100%' },
  flexItem: { flex: 1 },
  gap16: { width: 16, height: 16 }, 
  gap12: { width: 12 }, 
  
  label: { fontSize: 12, fontWeight: '800', marginBottom: 14, letterSpacing: 1 },
  iL: { fontSize: 12, marginBottom: 6, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  input: { borderRadius: 10, padding: 14, borderWidth: 1, fontSize: 15, minHeight: 50 },
  errT: { color: '#ef4444', fontSize: 10, marginTop: 4, fontWeight: 'bold', position: 'absolute', bottom: -16 },
  
  btn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  btnT: { fontWeight: 'bold', fontSize: 15 },
  
  res: { borderRadius: 20, padding: 24, borderTopWidth: 5, marginTop: 4 },
  resSt: { fontWeight: 'bold', fontSize: 20, marginBottom: 4 },
  resN: { fontSize: 32, fontWeight: '900' },
  detailT: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  targetT: { fontSize: 14, marginTop: 12, fontWeight: '700' },
  waBtn: { backgroundColor: '#25D366', marginTop: 24, padding: 16, borderRadius: 10, alignItems: 'center' },
  waBtnT: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  
  reset: { marginTop: 20, padding: 10, alignItems: 'center' },
  resetT: { color: '#ef4444', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  
  // ÇİZGİ ALTI BOŞLUĞU İÇİN SPACER (height: 40)
  spacer: { height: 40 },
  
  // ALT PANEL TASARIMI (Geri Bildirim)
  footerPanel: {
    width: '100%',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 10, 
    borderTopWidth: 2,
    marginTop: 'auto' // Paneli en alta iter
  },
  
  // Mesaj kutusu ve metni büyütüldü
  feedbackTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16 },
  feedbackRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  fInputMultiline: { 
    flex: 1, 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 15,
    minHeight: 100, // Kutu büyütüldü
    textAlignVertical: 'top'
  },
  fSendBtn: { 
    borderRadius: 12, 
    paddingHorizontal: 24, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  fSendBtnT: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  
  // BAĞIMSIZ İMZA STİLİ (created yazısı)
  footerBrand: { 
    textAlign: 'center', 
    marginTop: 20, 
    color: '#64748b', 
    fontSize: 16, 
    fontWeight: '800', 
    letterSpacing: 2 
  }
});
