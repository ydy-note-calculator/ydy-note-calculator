import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, TextInput, StyleSheet, Dimensions, Platform, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const GA_TRACKING_ID = 'G-FD2290G3VG';

export default function App() {
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
  }, [grades, selectedCourse, studentName, studentClassNum]);

  const saveData = async () => {
    try { 
      await AsyncStorage.setItem('@ydy_data', JSON.stringify({ grades, selectedCourse, studentName, studentClassNum })); 
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
        if (parsed.studentClassNum) setStudentClassNum(parsed.studentClassNum);
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
    const tamSinifAd = studentClassNum ? `${selectedCourse}${studentClassNum}` : '';
    const kimlik = studentName ? `${studentName} - ` : '';
    let text = `🚀 ${kimlik}${tamSinifAd} YDY Sonucum:\n\nKur: ${selectedCourse}\nOrtalama: ${results.ortalama}\n`;
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

  const handleSendFeedback = () => {
    if (!feedbackText.trim()) return;
    
    const ad = studentName.trim() || 'İsimsiz';
    const tamSinif = studentClassNum ? `${selectedCourse}${studentClassNum}` : 'Sınıfsız';
    const payload = `[${tamSinif}] ${ad}: ${feedbackText.trim()}`;

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
        
        <View style={styles.header}>
          <Text style={styles.title}>YDY</Text>
          <Text style={styles.subtitle}>Not Hesaplama Sistemi</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>KUR SEÇİMİ</Text>
          <View style={styles.rowCourse}>
            {['A', 'B', 'C'].map(k => (
              <TouchableOpacity key={k} onPress={() => setSelectedCourse(k)} style={[styles.btn, selectedCourse === k && styles.btnActive]}>
                <Text style={styles.btnT}>{k} KURU</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>ÖĞRENCİ BİLGİLERİ</Text>
          <View style={styles.rowSplit}>
            <View style={styles.flex}>
              <Text style={styles.iL}>Ad Soyad</Text>
              <TextInput 
                style={styles.inputKimlik} 
                value={studentName} 
                onChangeText={setStudentName} 
                placeholder="Ali Yılmaz" 
                placeholderTextColor="#475569"
              />
            </View>
            <View style={styles.flexSplit}>
              <Text style={styles.iL}>Sınıf (Örn: {selectedCourse}12)</Text>
              <View style={styles.classInputGroup}>
                <Text style={styles.classInputPrefix}>{selectedCourse}</Text>
                <TextInput 
                  style={[styles.inputKimlik, styles.classInputField]} 
                  value={studentClassNum} 
                  onChangeText={(text) => {
                    const filteredText = text.replace(/[^0-9]/g, '').slice(0, 2);
                    setStudentClassNum(filteredText);
                  }} 
                  placeholder="12" 
                  placeholderTextColor="#475569"
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>QUIZ NOTLARI</Text>
          <View style={styles.grid}>{grades.quiz.map((v, i) => (
            <View key={`q${i}`} style={styles.gridItem}>
              <Text style={styles.iL}>Quiz {i+1}</Text>
              <TextInput style={styles.inputGrade} keyboardType="numeric" value={v} onChangeText={t => handleInputChange('quiz', i, t)} maxLength={3} placeholder="0" placeholderTextColor="#475569"/>
            </View>
          ))}</View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>VİZE NOTLARI</Text>
          <View style={styles.grid}>{grades.vize.map((v, i) => (
            <View key={`v${i}`} style={styles.gridItem}>
              <Text style={styles.iL}>Vize {i+1}</Text>
              <TextInput style={styles.inputGrade} keyboardType="numeric" value={v} onChangeText={t => handleInputChange('vize', i, t)} maxLength={3} placeholder="0" placeholderTextColor="#475569"/>
            </View>
          ))}</View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>DİĞER NOTLAR</Text>
          <View style={styles.grid}>
            {[ {k:'writing', l:'Writing'}, {k:'sunum', l:'Sunum'}, {k:'kanaat', l:'Kanaat Notu'}, {k:'odev', l:'Online Ödev'} ].map(i => (
              <View key={i.k} style={styles.gridItemHalf}>
                <Text style={styles.iL}>{i.l}</Text>
                <TextInput style={styles.inputGrade} keyboardType="numeric" value={grades[i.k]} onChangeText={t => handleInputChange(i.k, null, t)} maxLength={3} placeholder="0" placeholderTextColor="#475569"/>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.sectionGradeKimlik, styles.flex]}><Text style={styles.labelGrade}>FİNAL</Text><TextInput style={styles.inputGradeKimlik} value={grades.final} onChangeText={t => handleInputChange('final', null, t)} maxLength={3} placeholder="0" placeholderTextColor="#475569"/></View>
          <View style={[styles.sectionGradeKimlik, styles.flex]}><Text style={styles.labelGrade}>BÜTÜNLEME</Text><TextInput style={styles.inputGradeKimlik} value={grades.butunleme} onChangeText={t => handleInputChange('butunleme', null, t)} maxLength={3} placeholder="0" placeholderTextColor="#475569"/></View>
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
        
        {/* Alt panelin ScrollView içeriğini kapatmaması için boşluk (Artırıldı) */}
        <View style={{ height: 260 }} /> 
      </ScrollView>

      {/* SABİT GERİ BİLDİRİM PANELİ VE İMZA */}
      <View style={styles.feedbackPanelFixed}>
        <Text style={styles.feedbackTitle}>Fikir, öneri veya sorunlarınızı bizimle paylaşın:</Text>
        <View style={styles.feedbackInputRow}>
          <TextInput 
            style={styles.fInputMultiline} 
            placeholder="Mesajınızı buraya yazın..." 
            placeholderTextColor="#64748b"
            value={feedbackText}
            onChangeText={setFeedbackText}
            maxLength={500}
            multiline={true}
            numberOfLines={4} 
          />
          <TouchableOpacity style={styles.fSendBtn} onPress={handleSendFeedback}>
            <Text style={styles.fSendBtnT}>Gönder</Text>
          </TouchableOpacity>
        </View>
        
        {/* İMZA ARTIK MESAJ KUTUSUNUN ALTINDA VE SABİT */}
        <View style={styles.footerPanel}>
          <Text style={styles.footerT}>Created by Alparslan Soyak</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { 
    paddingTop: 20,    // Üstten nefes payı
    paddingBottom: 20, // Alttan nefes payı
    paddingHorizontal: 16
  },
  header: { alignItems: 'center', marginTop: 30, marginBottom: 40 }, // Header boşluğu artırıldı
  title: { fontSize: 44, fontWeight: 'bold', color: '#fff', letterSpacing: 2 },
  subtitle: { color: '#c084fc', fontSize: 17, fontWeight: '700', marginTop: 4, letterSpacing: 1 },
  
  /* ANA PANELLER (Bölüm Araları Genişletildi) */
  section: { 
    backgroundColor: '#1e293b', 
    borderRadius: 14, 
    padding: 20,        // İç boşluk artırıldı
    marginBottom: 20,   // Paneller arası boşluk artırıldı
    borderWidth: 1, 
    borderColor: '#334155',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 2 // Hafif gölge
  },
  label: { 
    color: '#94a3b8', 
    fontSize: 11, 
    fontWeight: '800', 
    marginBottom: 16,   // Label ile kutular arası boşluk artırıldı
    letterSpacing: 1,
    textTransform: 'uppercase'
  },

  /* SATIR VE GRID SİSTEMLERİ (Aralar Genişletildi) */
  row: { flexDirection: 'row', gap: 16 }, // gap artırıldı
  rowCourse: { flexDirection: 'row', gap: 12 }, // Kur butonları arası gap
  rowSplit: { flexDirection: 'row', gap: 20 }, // Kimlik bilgileri arası gap
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, // gap artırıldı
  gridItem: { width: '22%' },
  gridItemHalf: { width: '47%' }, // Half genişliği gap ile uyumlu hale getirildi

  /* İÇ LABELLAR VE GİRİŞ KUTULARI (Daha Ferah) */
  iL: { 
    color: '#fff', 
    fontSize: 12, 
    marginBottom: 8,    // Label ile input arası boşluk artırıldı
    fontWeight: '500' 
  },
  
  /* Giriş Kutuları Stilleri (Ferahlatılmış) */
  inputGrade: { 
    backgroundColor: '#0f172a', 
    borderRadius: 8, 
    padding: 14,        // İç boşluk artırıldı (daha dolgun kutu)
    color: '#fff', 
    borderWidth: 1, 
    borderColor: '#475569', 
    fontSize: 14, 
    minHeight: 50       // Minimum yükseklik artırıldı
  },
  inputKimlik: {
    backgroundColor: '#0f172a', 
    borderRadius: 8, 
    padding: 14,
    color: '#fff', 
    borderWidth: 1, 
    borderColor: '#475569', 
    fontSize: 14, 
    minHeight: 50
  },

  /* KUR BUTONLARI (Daha Ferah) */
  btn: { 
    flex: 1, 
    paddingVertical: 14,  // Dikey boşluk artırıldı
    paddingHorizontal: 12,
    borderRadius: 10, 
    backgroundColor: '#334155', 
    alignItems: 'center' 
  },
  btnActive: { backgroundColor: '#a855f7' },
  btnT: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

  /* SONUÇ PANELİ (Daha Ferah) */
  res: { 
    backgroundColor: '#1e293b', 
    borderRadius: 16, 
    padding: 24,        // İç boşluk artırıldı
    borderTopWidth: 4, 
    marginTop: 20,      // Üst boşluk artırıldı
    shadowColor: '#000', 
    shadowOpacity: 0.3, 
    shadowRadius: 10, 
    elevation: 5 
  },
  resSt: { fontWeight: 'bold', fontSize: 18, marginBottom: 6 },
  resN: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  detailT: { color: '#94a3b8', fontSize: 16, fontWeight: '600', marginTop: 6 },
  targetT: { fontSize: 14, marginTop: 16, fontWeight: '600' }, // Hedef not boşluğu artırıldı
  waBtn: { 
    backgroundColor: '#25D366', 
    marginTop: 24,      // Buton üst boşluğu artırıldı
    padding: 16,        // Buton iç boşluğu artırıldı
    borderRadius: 10, 
    alignItems: 'center' 
  },
  waBtnT: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  /* SIFIRLA BUTONU */
  reset: { marginTop: 24, marginBottom: 10, padding: 10, alignItems: 'center' },
  resetT: { color: '#ef4444', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  
  flex: { flex: 1 },
  flexSplit: { flex: 0.6 }, // Sınıf kutusu daha dar

  /* Sınıf Prefix Giriş Grubu Stilleri */
  classInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
    minHeight: 50 // Giriş kutusuna uygun yükseklik
  },
  classInputPrefix: {
    color: '#fff',
    fontSize: 14,
    paddingLeft: 12,
    fontWeight: '700',
    borderRightWidth: 1,
    borderRightColor: '#475569',
    paddingRight: 8,
    marginRight: 4
  },
  classInputField: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingLeft: 4,
    flex: 1,
  },

  /* SABİT YAZI KUTUCUĞU TASARIMI (Sticky Bottom) */
  feedbackPanelFixed: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#1e293b',
    borderTopWidth: 2,
    borderTopColor: '#a855f7',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  feedbackTitle: { color: '#e2e8f0', fontSize: 12, fontWeight: '600', marginBottom: 12 },
  feedbackInputRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  fInputMultiline: { 
    flex: 1, 
    backgroundColor: '#0f172a', 
    borderWidth: 1, 
    borderColor: '#475569', 
    borderRadius: 8, 
    padding: 12, 
    color: '#fff', 
    fontSize: 15, 
    minHeight: 110, 
    textAlignVertical: 'top' 
  },
  fSendBtn: { 
    backgroundColor: '#a855f7', 
    paddingHorizontal: 16, 
    justifyContent: 'center', 
    borderRadius: 8, 
    minHeight: 46, 
    marginTop: 'auto' 
  },
  fSendBtnT: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  
  /* İMZA ALANI (Panel İçine Alındı) */
  footerPanel: {
    alignItems: 'center',
    marginTop: 18, 
    paddingBottom: 4
  },
  footerT: { 
    color: '#64748b', 
    fontSize: 15, 
    fontWeight: '700', 
    letterSpacing: 1.5 
  },

  /* Grade Kimlik Bölümleri İçin Özel Stiller */
  sectionGradeKimlik: {
    backgroundColor: '#1e293b', 
    borderRadius: 14, 
    padding: 16, 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: '#334155',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 2
  },
  inputGradeKimlik: {
    backgroundColor: '#0f172a', 
    borderRadius: 8, 
    padding: 12, 
    color: '#fff', 
    borderWidth: 1, 
    borderColor: '#475569', 
    fontSize: 14, 
    minHeight: 46
  },
  labelGrade: {
    color: '#94a3b8', 
    fontSize: 11, 
    fontWeight: '800', 
    marginBottom: 12, 
    letterSpacing: 1,
    textTransform: 'uppercase'
  }
});
