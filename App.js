import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, TextInput, StyleSheet, Dimensions, Platform, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const GA_TRACKING_ID = 'G-FD2290G3VG';

export default function App() {
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('A');
  const [grades, setGrades] = useState({
    quiz: ['', '', '', ''], vize: ['', '', '', ''],
    writing: '', sunum: '', kanaat: '', odev: '', final: '', butunleme: '',
  });

  const [results, setResults] = useState(null);
  const [targetNote, setTargetNote] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  // Google Analytics Kurulumu
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.documentElement.lang = 'tr';
      const meta = document.createElement('meta');
      meta.name = 'google';
      meta.content = 'notranslate';
      document.head.appendChild(meta);

      const script1 = document.createElement('script');
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
      document.head.appendChild(script1);

      const script2 = document.createElement('script');
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_TRACKING_ID}');
      `;
      document.head.appendChild(script2);
    }
    loadSavedData();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      calculateGrade();
      saveData();
    }
  }, [grades, selectedCourse, studentName, studentClass]);

  const saveData = async () => {
    try { 
      await AsyncStorage.setItem('@ydy_data', JSON.stringify({ grades, selectedCourse, studentName, studentClass })); 
    } catch (e) { console.error(e); }
  };

  const loadSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('@ydy_data');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.grades) setGrades(parsed.grades);
        if (parsed.selectedCourse) setSelectedCourse(parsed.selectedCourse);
        if (parsed.studentName) setStudentName(parsed.studentName);
        if (parsed.studentClass) setStudentClass(parsed.studentClass);
      }
    } catch (e) { console.error(e); } finally { setIsLoaded(true); }
  };

  const calculateGrade = () => {
    const quizValues = grades.quiz.map(v => parseFloat(v) || 0);
    const vizeValues = grades.vize.map(v => parseFloat(v) || 0);
    const quizPoints = (quizValues.reduce((a, b) => a + b, 0) / 4 / 100) * 20;
    const vizePoints = (vizeValues.reduce((a, b) => a + b, 0) / 4 / 100) * 60;
    const writingPoints = (parseFloat(grades.writing) || 0) / 100 * 5;
    const sunumPoints = (parseFloat(grades.sunum) || 0) / 100 * 5;
    const kanaatPoints = (parseFloat(grades.kanaat) || 0) / 100 * 5;
    const odevPoints = (parseFloat(grades.odev) || 0) / 100 * 5;

    const ortalama = quizPoints + vizePoints + writingPoints + sunumPoints + kanaatPoints + odevPoints;
    const minForPass = selectedCourse === 'A' ? 84.5 : selectedCourse === 'B' ? 79.5 : 74.5;
    
    if (grades.final === '') {
      const needed = Math.ceil((65 - (ortalama * 0.4)) / 0.6);
      if (ortalama >= minForPass) setTargetNote({ type: 'pass', text: 'Ortalamanız geçmek için yeterli!' });
      else if (needed <= 100) setTargetNote({ type: 'target', text: `Finalde gereken minimum not: ${needed}` });
      else setTargetNote({ type: 'fail', text: 'Finalden 100 alsanız bile geçilemiyor!' });
    } else { setTargetNote(null); }

    let res = { ortalama: ortalama.toFixed(2), durum: '', renk: '', finalHesap: null, butunlemeHesap: null };
    
    if (ortalama >= minForPass) { 
      res.durum = 'Ortalama ile Geçtiniz ✓'; 
      res.renk = '#10b981'; 
      if (grades.final !== '') res.finalHesap = (parseFloat(grades.final) * 0.6 + ortalama * 0.4).toFixed(2);
    }
    else if (grades.final === '') { 
      res.durum = 'Finale Kaldınız'; 
      res.renk = '#ef4444'; 
    }
    else {
      const fScore = (parseFloat(grades.final) * 0.6 + ortalama * 0.4).toFixed(2);
      res.finalHesap = fScore; 
      
      if (fScore >= 64.5) { res.durum = 'Final ile Geçtiniz ✓'; res.renk = '#10b981'; }
      else if (grades.butunleme === '') { res.durum = 'Bütünlemeye Kaldınız'; res.renk = '#ef4444'; }
      else {
        const bScore = (parseFloat(grades.butunleme) * 0.6 + ortalama * 0.4).toFixed(2);
        res.butunlemeHesap = bScore; 
        const isP = bScore >= 64.5;
        res.durum = isP ? 'Bütünleme ile Geçtiniz ✓' : 'Kaldınız ✗';
        res.renk = isP ? '#10b981' : '#ef4444';
      }
    }
    setResults(res);
  };

  const shareOnWhatsApp = () => {
    if (!results) return;
    const kimlik = studentName ? `${studentName} - ` : '';
    let text = `🚀 ${kimlik}YDY Sonucum:\n\nKur: ${selectedCourse}\nOrtalama: ${results.ortalama}\n`;
    if (grades.final !== '' && results.finalHesap && grades.butunleme === '') text += `Yıl Sonu Notu: ${results.finalHesap}\n`;
    if (grades.butunleme !== '' && results.butunlemeHesap) text += `Yıl Sonu Notu: ${results.butunlemeHesap}\n`;
    text += `Durum: ${results.durum}\n`;
    if (targetNote) text += `Hedef: ${targetNote.text}\n`;
    text += `\nUygulama: ${window.location.href}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const handleInputChange = (f, i, v) => {
    const val = v === '' ? '' : Math.min(Math.max(parseFloat(v) || 0, 0), 100).toString();
    if (Array.isArray(grades[f])) {
      const n = [...grades[f]]; n[i] = val; setGrades({ ...grades, [f]: n });
    } else { setGrades({ ...grades, [f]: val }); }
  };

  // İsim ve Sınıf verisini mesajla birleştirip Google Analytics'e ileten protokol
  const handleSendFeedback = () => {
    if (!feedbackText.trim()) return;
    
    const ad = studentName.trim() || 'İsimsiz';
    const sinif = studentClass.trim() || 'Belirtilmemiş';
    const payload = `[${sinif}] ${ad}: ${feedbackText.trim()}`;

    if (Platform.OS === 'web' && window.gtag) {
      window.gtag('event', 'user_feedback_text', {
        'event_category': 'Feedback',
        'event_label': payload,
      });
      alert('Mesajınız başarıyla iletildi. Teşekkür ederiz!');
      setFeedbackText(''); 
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Text style={styles.title}>YDY</Text><Text style={styles.subtitle}>Not Hesaplama Sistemi</Text></View>

        {/* YENİ: ÖĞRENCİ BİLGİLERİ ALANI */}
        <View style={styles.section}>
          <Text style={styles.label}>ÖĞRENCİ BİLGİLERİ</Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.iL}>Ad Soyad</Text>
              <TextInput 
                style={styles.input} 
                value={studentName} 
                onChangeText={setStudentName} 
                placeholder="Örn: Ali Yılmaz" 
                placeholderTextColor="#475569"
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.iL}>Sınıf</Text>
              <TextInput 
                style={styles.input} 
                value={studentClass} 
                onChangeText={setStudentClass} 
                placeholder="Örn: Hazırlık A" 
                placeholderTextColor="#475569"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>KUR SEÇİMİ</Text>
          <View style={styles.row}>
            {['A', 'B', 'C'].map(k => (
              <TouchableOpacity key={k} onPress={() => setSelectedCourse(k)} style={[styles.btn, selectedCourse === k && styles.btnActive]}>
                <Text style={styles.btnT}>{k} KURU</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>QUIZ NOTLARI</Text>
          <View style={styles.grid}>{grades.quiz.map((v, i) => (
            <View key={`q${i}`} style={styles.item}><Text style={styles.iL}>Quiz {i+1}</Text><TextInput style={styles.input} keyboardType="numeric" value={v} onChangeText={t => handleInputChange('quiz', i, t)} maxLength={3} placeholder="0" placeholderTextColor="#475569"/></View>
          ))}</View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>VİZE NOTLARI</Text>
          <View style={styles.grid}>{grades.vize.map((v, i) => (
            <View key={`v${i}`} style={styles.item}><Text style={styles.iL}>Vize {i+1}</Text><TextInput style={styles.input} keyboardType="numeric" value={v} onChangeText={t => handleInputChange('vize', i, t)} maxLength={3} placeholder="0" placeholderTextColor="#475569"/></View>
          ))}</View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>DİĞER NOTLAR</Text>
          <View style={styles.grid}>
            {[ {k:'writing', l:'Writing'}, {k:'sunum', l:'Sunum'}, {k:'kanaat', l:'Kanaat Notu'}, {k:'odev', l:'Online Ödev'} ].map(i => (
              <View key={i.k} style={styles.half}><Text style={styles.iL}>{i.l}</Text><TextInput style={styles.input} keyboardType="numeric" value={grades[i.k]} onChangeText={t => handleInputChange(i.k, null, t)} maxLength={3} placeholder="0" placeholderTextColor="#475569"/></View>
            ))}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.section, styles.flex]}><Text style={styles.label}>FİNAL</Text><TextInput style={styles.input} value={grades.final} onChangeText={t => handleInputChange('final', null, t)} maxLength={3} placeholder="0" placeholderTextColor="#475569"/></View>
          <View style={[styles.section, styles.flex]}><Text style={styles.label}>BÜTÜNLEME</Text><TextInput style={styles.input} value={grades.butunleme} onChangeText={t => handleInputChange('butunleme', null, t)} maxLength={3} placeholder="0" placeholderTextColor="#475569"/></View>
        </View>

        {results && (
          <View style={[styles.res, { borderTopColor: results.renk }]}>
            <Text style={[styles.resSt, { color: results.renk }]}>{results.durum}</Text>
            <Text style={styles.resN}>Ortalama: {results.ortalama}</Text>
            
            {grades.final !== '' && results.finalHesap !== null && grades.butunleme === '' && (
              <Text style={styles.detailT}>Yıl Sonu Notu: {results.finalHesap}</Text>
            )}
            
            {grades.butunleme !== '' && results.butunlemeHesap !== null && (
              <Text style={styles.detailT}>Yıl Sonu Notu: {results.butunlemeHesap}</Text>
            )}

            {targetNote && <Text style={[styles.targetT, { color: targetNote.type === 'fail' ? '#ef4444' : '#c084fc' }]}>{targetNote.text}</Text>}
            <TouchableOpacity style={styles.waBtn} onPress={shareOnWhatsApp}><Text style={styles.waBtnT}>WhatsApp ile Paylaş</Text></TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.reset} onPress={() => setGrades({quiz:['','','',''],vize:['','','',''],writing:'',sunum:'',kanaat:'',odev:'',final:'',butunleme:''})}><Text style={styles.resetT}>Tüm Notları Sıfırla</Text></TouchableOpacity>

        <View style={styles.footer}><Text style={styles.footerT}>Created by Alparslan Soyak</Text></View>
        
        {/* Alt panelin imzayı kapatmaması için zemin boşluğu */}
        <View style={{ height: 120 }} /> 
      </ScrollView>

      {/* SABİT GERİ BİLDİRİM PANELİ */}
      <View style={styles.feedbackPanel}>
        <Text style={styles.feedbackTitle}>Fikir, öneri veya sorunlarınızı bizimle paylaşın:</Text>
        <View style={styles.feedbackInputRow}>
          <TextInput 
            style={styles.fInput} 
            placeholder="Mesajınızı buraya yazın..." 
            placeholderTextColor="#64748b"
            value={feedbackText}
            onChangeText={setFeedbackText}
            maxLength={150}
          />
          <TouchableOpacity style={styles.fSendBtn} onPress={handleSendFeedback}>
            <Text style={styles.fSendBtnT}>Gönder</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 16 },
  header: { alignItems: 'center', marginVertical: 30 },
  title: { fontSize: 44, fontWeight: 'bold', color: '#fff', letterSpacing: 2 },
  subtitle: { color: '#c084fc', fontSize: 13, fontWeight: '500' },
  section: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  label: { color: '#94a3b8', fontSize: 11, fontWeight: '800', marginBottom: 12, letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: { width: '22%' },
  half: { width: '48%' },
  iL: { color: '#fff', fontSize: 12, marginBottom: 6, fontWeight: '500' },
  input: { backgroundColor: '#0f172a', borderRadius: 8, padding: 12, color: '#fff', borderWidth: 1, borderColor: '#475569', fontSize: 14 },
  btn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#334155', alignItems: 'center' },
  btnActive: { backgroundColor: '#a855f7' },
  btnT: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  res: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, borderTopWidth: 4, marginTop: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  resSt: { fontWeight: 'bold', fontSize: 18, marginBottom: 4 },
  resN: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  detailT: { color: '#94a3b8', fontSize: 16, fontWeight: '600', marginTop: 4 },
  targetT: { fontSize: 14, marginTop: 12, fontWeight: '600' },
  waBtn: { backgroundColor: '#25D366', marginTop: 20, padding: 14, borderRadius: 10, alignItems: 'center' },
  waBtnT: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  reset: { marginTop: 20, padding: 10, alignItems: 'center' },
  resetT: { color: '#ef4444', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  footer: { alignItems: 'center', marginTop: 40, paddingBottom: 20 },
  footerT: { color: '#64748b', fontSize: 16, fontWeight: '700', letterSpacing: 1.5 },
  flex: { flex: 1 },
  feedbackPanel: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#1e293b',
    borderTopWidth: 2,
    borderTopColor: '#a855f7',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  feedbackTitle: { color: '#e2e8f0', fontSize: 12, fontWeight: '600', marginBottom: 10 },
  feedbackInputRow: { flexDirection: 'row', gap: 10 },
  fInput: { flex: 1, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#475569', borderRadius: 8, padding: 10, color: '#fff', fontSize: 13 },
  fSendBtn: { backgroundColor: '#a855f7', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8 },
  fSendBtnT: { color: '#fff', fontWeight: 'bold', fontSize: 13 }
});
