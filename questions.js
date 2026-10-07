// Başlangıç soru seti.
// Çoktan seçmeli (t:'mc'): o[0] HER ZAMAN doğru cevaptır; oyun başlarken şıklar karıştırılır.
// Tahmin (t:'num'): a = doğru sayı, unit = birim. tolAbs varsa puan mutlak farka göre
// (örn. yıllar), yoksa doğru cevabın %25'i içindeki yakınlığa göre hesaplanır.
export const QUESTIONS = [
  // Coğrafya
  {t:'mc', cat:'Coğrafya', q:'Türkiye’nin en yüksek dağı hangisidir?', o:['Ağrı Dağı','Erciyes Dağı','Uludağ','Süphan Dağı']},
  {t:'mc', cat:'Coğrafya', q:'Tamamı Türkiye sınırları içinde kalan en uzun nehir hangisidir?', o:['Kızılırmak','Fırat','Sakarya','Yeşilırmak']},
  {t:'mc', cat:'Coğrafya', q:'Türkiye’nin yüzölçümü en büyük gölü hangisidir?', o:['Van Gölü','Tuz Gölü','Beyşehir Gölü','Eğirdir Gölü']},
  {t:'mc', cat:'Coğrafya', q:'Avustralya’nın başkenti neresidir?', o:['Kanberra','Sidney','Melbourne','Perth']},
  {t:'mc', cat:'Coğrafya', q:'Yüzölçümü en büyük ülke hangisidir?', o:['Rusya','Kanada','Çin','ABD']},
  {t:'mc', cat:'Coğrafya', q:'Kanada’nın başkenti neresidir?', o:['Ottawa','Toronto','Montreal','Vancouver']},
  {t:'mc', cat:'Coğrafya', q:'Dünyanın en büyük okyanusu hangisidir?', o:['Büyük Okyanus','Atlas Okyanusu','Hint Okyanusu','Arktik Okyanusu']},
  {t:'mc', cat:'Coğrafya', q:'Brezilya’nın resmî dili nedir?', o:['Portekizce','İspanyolca','Fransızca','İngilizce']},
  {t:'mc', cat:'Coğrafya', q:'Nil Nehri hangi denize dökülür?', o:['Akdeniz','Kızıldeniz','Ölü Deniz','Karadeniz']},
  {t:'mc', cat:'Coğrafya', q:'Mısır’ın başkenti neresidir?', o:['Kahire','İskenderiye','Gize','Luksor']},
  {t:'num', cat:'Coğrafya', q:'Türkiye kaç ilden oluşur?', a:81, unit:'il'},
  {t:'num', cat:'Coğrafya', q:'Everest Dağı’nın yüksekliği kaç metredir?', a:8849, unit:'metre'},
  {t:'num', cat:'Coğrafya', q:'Dünya’nın ekvator çevresi yaklaşık kaç kilometredir?', a:40075, unit:'km'},

  // Tarih
  {t:'mc', cat:'Tarih', q:'İstanbul hangi yıl fethedildi?', o:['1453','1071','1299','1517']},
  {t:'mc', cat:'Tarih', q:'Türkiye Cumhuriyeti hangi yıl ilan edildi?', o:['1923','1920','1919','1938']},
  {t:'mc', cat:'Tarih', q:'Malazgirt Meydan Muharebesi hangi yıl yapıldı?', o:['1071','1176','1243','1402']},
  {t:'mc', cat:'Tarih', q:'Osmanlı Devleti’nin kurucusu kimdir?', o:['Osman Bey','Orhan Bey','Ertuğrul Gazi','I. Murad']},
  {t:'mc', cat:'Tarih', q:'TBMM hangi tarihte açıldı?', o:['23 Nisan 1920','29 Ekim 1923','19 Mayıs 1919','30 Ağustos 1922']},
  {t:'mc', cat:'Tarih', q:'İkinci Dünya Savaşı hangi yıl sona erdi?', o:['1945','1944','1939','1950']},
  {t:'mc', cat:'Tarih', q:'Ay’a ayak basan ilk insan kimdir?', o:['Neil Armstrong','Buzz Aldrin','Yuri Gagarin','Michael Collins']},
  {t:'mc', cat:'Tarih', q:'Gize’deki piramitlerin en büyüğü hangisidir?', o:['Keops Piramidi','Kefren Piramidi','Mikerinos Piramidi','Djoser Piramidi']},
  {t:'mc', cat:'Tarih', q:'Fransız İhtilali hangi yıl başladı?', o:['1789','1776','1815','1848']},
  {t:'num', cat:'Tarih', q:'Eyfel Kulesi hangi yıl tamamlandı?', a:1889, unit:'yılı', tolAbs:60},
  {t:'num', cat:'Tarih', q:'Titanik hangi yıl battı?', a:1912, unit:'yılı', tolAbs:50},

  // Bilim
  {t:'mc', cat:'Bilim', q:'Güneş Sistemi’nin en büyük gezegeni hangisidir?', o:['Jüpiter','Satürn','Neptün','Uranüs']},
  {t:'mc', cat:'Bilim', q:'Suyun kimyasal formülü nedir?', o:['H₂O','CO₂','H₂O₂','O₂']},
  {t:'mc', cat:'Bilim', q:'“Kızıl gezegen” olarak bilinen gezegen hangisidir?', o:['Mars','Venüs','Merkür','Jüpiter']},
  {t:'mc', cat:'Bilim', q:'İnsan vücudunun en büyük organı hangisidir?', o:['Deri','Karaciğer','Akciğer','Beyin']},
  {t:'mc', cat:'Bilim', q:'Altının kimyasal sembolü nedir?', o:['Au','Ag','Al','Fe']},
  {t:'mc', cat:'Bilim', q:'Güneş’e en yakın gezegen hangisidir?', o:['Merkür','Venüs','Mars','Dünya']},
  {t:'mc', cat:'Bilim', q:'Bitkiler fotosentez sırasında havaya hangi gazı verir?', o:['Oksijen','Karbondioksit','Azot','Hidrojen']},
  {t:'mc', cat:'Bilim', q:'Evrensel çekim yasasını ortaya koyan bilim insanı kimdir?', o:['Isaac Newton','Albert Einstein','Galileo Galilei','Nikola Tesla']},
  {t:'mc', cat:'Bilim', q:'Elmas hangi elementten oluşur?', o:['Karbon','Silisyum','Kalsiyum','Azot']},
  {t:'num', cat:'Bilim', q:'Işık boşlukta saniyede kaç kilometre yol alır?', a:299792, unit:'km'},
  {t:'num', cat:'Bilim', q:'Yetişkin bir insanın iskeletinde kaç kemik vardır?', a:206, unit:'kemik'},
  {t:'num', cat:'Bilim', q:'Ay ile Dünya arasındaki ortalama uzaklık kaç kilometredir?', a:384400, unit:'km'},
  {t:'num', cat:'Bilim', q:'Su, deniz seviyesinde kaç santigrat derecede kaynar?', a:100, unit:'°C'},
  {t:'num', cat:'Bilim', q:'Dünya ile Güneş arasındaki ortalama uzaklık yaklaşık kaç milyon kilometredir?', a:150, unit:'milyon km'},

  // Edebiyat
  {t:'mc', cat:'Edebiyat', q:'“Kürk Mantolu Madonna” romanının yazarı kimdir?', o:['Sabahattin Ali','Orhan Pamuk','Yaşar Kemal','Oğuz Atay']},
  {t:'mc', cat:'Edebiyat', q:'“İnce Memed” romanının yazarı kimdir?', o:['Yaşar Kemal','Orhan Kemal','Kemal Tahir','Fakir Baykurt']},
  {t:'mc', cat:'Edebiyat', q:'İstiklal Marşı’nın şairi kimdir?', o:['Mehmet Akif Ersoy','Namık Kemal','Ziya Gökalp','Tevfik Fikret']},
  {t:'mc', cat:'Edebiyat', q:'Nobel Edebiyat Ödülü’nü kazanan ilk Türk yazar kimdir?', o:['Orhan Pamuk','Yaşar Kemal','Nazım Hikmet','Elif Şafak']},
  {t:'mc', cat:'Edebiyat', q:'“Suç ve Ceza” romanının yazarı kimdir?', o:['Fyodor Dostoyevski','Lev Tolstoy','Anton Çehov','Aleksandr Puşkin']},
  {t:'mc', cat:'Edebiyat', q:'“Tutunamayanlar” romanının yazarı kimdir?', o:['Oğuz Atay','Yusuf Atılgan','Sait Faik Abasıyanık','Ahmet Hamdi Tanpınar']},
  {t:'mc', cat:'Edebiyat', q:'“Romeo ve Juliet” kimin eseridir?', o:['William Shakespeare','Charles Dickens','Johann Wolfgang von Goethe','Victor Hugo']},
  {t:'mc', cat:'Edebiyat', q:'“Don Kişot” romanının yazarı kimdir?', o:['Miguel de Cervantes','Dante Alighieri','Victor Hugo','Jules Verne']},

  // Sanat ve müzik
  {t:'mc', cat:'Sanat', q:'Mona Lisa tablosunu kim yapmıştır?', o:['Leonardo da Vinci','Michelangelo','Rafael','Botticelli']},
  {t:'mc', cat:'Sanat', q:'“Yıldızlı Gece” tablosunun ressamı kimdir?', o:['Vincent van Gogh','Claude Monet','Pablo Picasso','Salvador Dalí']},
  {t:'mc', cat:'Sanat', q:'“Kaplumbağa Terbiyecisi” tablosunun ressamı kimdir?', o:['Osman Hamdi Bey','Şeker Ahmet Paşa','Hoca Ali Rıza','İbrahim Çallı']},
  {t:'mc', cat:'Sanat', q:'Süleymaniye Camii’nin mimarı kimdir?', o:['Mimar Sinan','Sedefkâr Mehmed Ağa','Mimar Kemaleddin','Davud Ağa']},
  {t:'mc', cat:'Müzik', q:'Aşağıdaki çalgılardan hangisi telli değildir?', o:['Ney','Bağlama','Ud','Keman']},
  {t:'mc', cat:'Müzik', q:'“Dört Mevsim” adlı eserin bestecisi kimdir?', o:['Antonio Vivaldi','Johann Sebastian Bach','Wolfgang Amadeus Mozart','Frédéric Chopin']},
  {t:'num', cat:'Müzik', q:'Beethoven toplam kaç senfoni tamamlamıştır?', a:9, unit:'senfoni'},

  // Spor
  {t:'mc', cat:'Spor', q:'Voleybolda bir takım sahada kaç oyuncuyla oynar?', o:['6','5','7','11']},
  {t:'mc', cat:'Spor', q:'Basketbolda başarılı bir serbest atış kaç sayı değerindedir?', o:['1','2','3','4']},
  {t:'num', cat:'Spor', q:'Futbolda bir takım sahaya kaç oyuncuyla çıkar?', a:11, unit:'oyuncu'},
  {t:'num', cat:'Spor', q:'Olimpiyat bayrağında kaç halka vardır?', a:5, unit:'halka'},
  {t:'num', cat:'Spor', q:'Satranç tahtasında toplam kaç kare vardır?', a:64, unit:'kare'},
  {t:'num', cat:'Spor', q:'Futbolda bir maçın normal süresi kaç dakikadır?', a:90, unit:'dakika'},

  // Teknoloji
  {t:'mc', cat:'Teknoloji', q:'“WWW” kısaltması neyin açılımıdır?', o:['World Wide Web','Wide World Web','Web World Wide','World Web Wide']},
  {t:'mc', cat:'Teknoloji', q:'Apple’ın kurucularından biri kimdir?', o:['Steve Jobs','Bill Gates','Mark Zuckerberg','Larry Page']},
  {t:'mc', cat:'Teknoloji', q:'Aşağıdakilerden hangisi bir web tarayıcısıdır?', o:['Firefox','Linux','Python','Excel']},
  {t:'num', cat:'Teknoloji', q:'Bir bayt kaç bitten oluşur?', a:8, unit:'bit'},

  // Yemek
  {t:'mc', cat:'Yemek', q:'Guacamole’nin ana malzemesi nedir?', o:['Avokado','Domates','Nohut','Patlıcan']},
  {t:'mc', cat:'Yemek', q:'Humus hangi baklagilden yapılır?', o:['Nohut','Mercimek','Fasulye','Bezelye']},
  {t:'mc', cat:'Yemek', q:'Suşide geleneksel olarak hangi tahıl kullanılır?', o:['Pirinç','Buğday','Arpa','Mısır']},
  {t:'mc', cat:'Yemek', q:'Pizza hangi ülkenin mutfağından çıkmıştır?', o:['İtalya','Yunanistan','Fransa','İspanya']},

  // Hayvanlar ve doğa
  {t:'mc', cat:'Doğa', q:'Dünyanın en büyük hayvanı hangisidir?', o:['Mavi balina','Afrika fili','Balina köpekbalığı','Zürafa']},
  {t:'mc', cat:'Doğa', q:'Kanguru hangi kıtaya özgüdür?', o:['Avustralya','Afrika','Güney Amerika','Asya']},
  {t:'mc', cat:'Doğa', q:'Aşağıdakilerden hangisi memeli değildir?', o:['Penguen','Yunus','Yarasa','Balina']},
  {t:'num', cat:'Doğa', q:'Örümceklerin kaç bacağı vardır?', a:8, unit:'bacak'},
  {t:'num', cat:'Doğa', q:'Bir arının kaç bacağı vardır?', a:6, unit:'bacak'},

  // Dil ve deyimler
  {t:'mc', cat:'Dil', q:'“Ağzı kulaklarına varmak” deyimi ne anlama gelir?', o:['Çok sevinmek','Çok konuşmak','Çok şaşırmak','Dedikodu yapmak']},
  {t:'mc', cat:'Dil', q:'“Burnu havada olmak” deyimi ne anlama gelir?', o:['Kibirli olmak','Hasta olmak','Meraklı olmak','Neşeli olmak']},
  {t:'mc', cat:'Dil', q:'“Göz yummak” deyimi ne anlama gelir?', o:['Bir kusuru görmezden gelmek','Uyumak','Ağlamak','Dikkatle bakmak']},
  {t:'num', cat:'Dil', q:'Türk alfabesinde kaç harf vardır?', a:29, unit:'harf'}
];
