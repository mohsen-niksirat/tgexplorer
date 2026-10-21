// ============================================================
// channels-deprecated.js — channels that failed live verification
// (the username now belongs to a user/bot or the channel is gone).
// Auto-managed by: node verify_channels.js --prune — do not edit by hand.
// ============================================================
const DEPRECATED_DB = [
  {username:'irna',title:'خبرگزاری ایرنا',members:'900K',description:'خبرگزاری رسمی جمهوری اسلامی ایران',tags:['news','persian'],lang:'fa'},
  {username:'isna',title:'خبرگزاری ایسنا',members:'800K',description:'خبرگزاری دانشجویان ایران',tags:['news','persian','education'],lang:'fa'},
  {username:'ilnanews',title:'خبرگزاری ایلنا',members:'600K',description:'خبرگزاری کار ایران',tags:['news','persian'],lang:'fa'},
  {username:'bornanews',title:'خبرگزاری برنا',members:'700K',description:'خبرگزاری برنا',tags:['news','persian'],lang:'fa'},
  {username:'hamshahrionline',title:'همشهری آنلاین',members:'800K',description:'پایگاه خبری همشهری آنلاین',tags:['news','persian'],lang:'fa'},
  {username:'eghtesadnews',title:'اقتصادنیوز',members:'500K',description:'پایگاه خبری اقتصادنیوز',tags:['news','persian','crypto'],lang:'fa'},
  {username:'roozonline',title:'روزآنلاین',members:'400K',description:'روزنامه آنلاین ایران',tags:['news','persian'],lang:'fa'},
  {username:'alibaba_com',title:'علی‌بابا',members:'500K',description:'رزرو هتل و بلیط با علی‌بابا',tags:['travel','persian'],lang:'fa'},
  {username:'snappapp',title:'اسنپ',members:'700K',description:'سوپراپلیکیشن اسنپ',tags:['tech','persian'],lang:'fa'},
  {username:'virgool',title:'ویرگول',members:'200K',description:'وبلاگ فارسی ویرگول',tags:['tech','persian','education'],lang:'fa'},
  {username:'jobinja',title:'جابینجا',members:'400K',description:'استخدام با جابینجا',tags:['tech','persian'],lang:'fa'},
  {username:'aparatcom',title:'آپارات',members:'900K',description:'سرویس اشتراک ویدیو آپارات',tags:['entertainment','persian','tech'],lang:'fa'},
  {username:'fidibo',title:'فیدیبو',members:'300K',description:'کتاب الکترونیک فیدیبو',tags:['education','persian'],lang:'fa'},
  {username:'taaghche',title:'طاقچه',members:'300K',description:'کتاب الکترونیک طاقچه',tags:['education','persian'],lang:'fa'},
  {username:'caffebazar',title:'کافه‌بازار',members:'800K',description:'فروشگاه اپلیکیشن کافه‌بازار',tags:['tech','persian'],lang:'fa'},
  {username:'reuters',title:'Reuters',members:'1.5M',description:'World news from Reuters',tags:['news'],lang:'en'},
  {username:'bbcnews',title:'BBC News',members:'3M',description:'Breaking news from the BBC',tags:['news'],lang:'en'},
  {username:'forbes',title:'Forbes',members:'1M',description:'Business and finance news',tags:['news'],lang:'en'},
  {username:'binance',title:'Binance',members:'2M',description:'Binance crypto exchange updates',tags:['crypto'],lang:'en'},
  {username:'nasa',title:'NASA',members:'1.5M',description:'Space exploration from NASA',tags:['science'],lang:'en'},
  {username:'natgeo',title:'National Geographic',members:'1M',description:'Science and exploration',tags:['science','travel','photography'],lang:'en'},
  {username:'goal',title:'GOAL',members:'1M',description:'Football news and scores',tags:['sports'],lang:'en'},
  {username:'barcelonafc',title:'FC Barcelona',members:'900K',description:'FC Barcelona official updates',tags:['sports'],lang:'en'},
  {username:'xbox',title:'Xbox',members:'1M',description:'Xbox gaming news',tags:['gaming'],lang:'en'},
  {username:'steam',title:'Steam',members:'1M',description:'Steam gaming platform news',tags:['gaming'],lang:'en'},
  {username:'minecraft',title:'Minecraft',members:'1.2M',description:'Minecraft official updates',tags:['gaming'],lang:'en'},
  {username:'coldplay',title:'Coldplay',members:'1M',description:'Coldplay official updates',tags:['music'],lang:'en'},
  {username:'taylorswift',title:'Taylor Swift',members:'1.5M',description:'Taylor Swift official updates',tags:['music'],lang:'en'},
  {username:'netflix',title:'Netflix',members:'92K',description:'Unofficial Netflix fan club — movies & series',tags:['cinema','movies'],lang:'en'},
];
