// Konu paketleri: dar kapsamlı, zorluk seviyesi olmayan soru setleri (ilk şık doğru cevap)
const m = (q, ...o) => ({t: 'mc', cat: 'Plakalar', d: 'o', q, o});
export const PACKS = [
  {id: 'plaka', name: 'Türkiye plakaları', icon: '🚗', desc: 'İl plaka kodlarını ne kadar biliyorsun?', qs: [
    m('34 hangi ilin plakasıdır?', 'İstanbul', 'Ankara', 'İzmir', 'Bursa'),
    m('Konya’nın plaka kodu kaçtır?', '42', '40', '44', '46'),
    m('06 hangi ilin plakasıdır?', 'Ankara', 'Adana', 'Antalya', 'Aydın'),
    m('68 hangi ilin plakasıdır?', 'Aksaray', 'Amasya', 'Artvin', 'Ardahan'),
    m('Trabzon’un plaka kodu kaçtır?', '61', '16', '60', '63'),
    m('35 hangi ilin plakasıdır?', 'İzmir', 'Isparta', 'Mersin', 'Manisa'),
    m('Gaziantep’in plaka kodu kaçtır?', '27', '25', '31', '72'),
    m('65 hangi ilin plakasıdır?', 'Van', 'Bitlis', 'Bingöl', 'Muş'),
    m('Samsun’un plaka kodu kaçtır?', '55', '05', '35', '58'),
    m('21 hangi ilin plakasıdır?', 'Diyarbakır', 'Denizli', 'Düzce', 'Edirne'),
    m('Antalya’nın plaka kodu kaçtır?', '07', '06', '70', '17'),
    m('16 hangi ilin plakasıdır?', 'Bursa', 'Bilecik', 'Balıkesir', 'Bolu'),
    m('Adana’nın plaka kodu kaçtır?', '01', '10', '06', '31'),
    m('Eskişehir’in plaka kodu kaçtır?', '26', '25', '27', '62'),
    m('33 hangi ilin plakasıdır?', 'Mersin', 'Malatya', 'Manisa', 'Mardin'),
    m('Kayseri’nin plaka kodu kaçtır?', '38', '36', '37', '58'),
    m('Edirne’nin plaka kodu kaçtır?', '22', '02', '20', '24'),
    m('17 hangi ilin plakasıdır?', 'Çanakkale', 'Çankırı', 'Çorum', 'Edirne'),
    m('48 hangi ilin plakasıdır?', 'Muğla', 'Mardin', 'Muş', 'Malatya'),
    m('Hatay’ın plaka kodu kaçtır?', '31', '13', '30', '33'),
    m('47 hangi ilin plakasıdır?', 'Mardin', 'Muğla', 'Manisa', 'Mersin'),
    m('72 hangi ilin plakasıdır?', 'Batman', 'Bitlis', 'Bingöl', 'Bartın'),
    m('81 hangi ilin plakasıdır?', 'Düzce', 'Osmaniye', 'Karabük', 'Kilis'),
    m('Sinop’un plaka kodu kaçtır?', '57', '55', '58', '75'),
    m('Rize’nin plaka kodu kaçtır?', '53', '52', '54', '35')
  ]}
];
