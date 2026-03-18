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
        const bScore = (parseFloat(grades.butunleme) * 0.6 + ortalama * 0.4).toFixed(2
