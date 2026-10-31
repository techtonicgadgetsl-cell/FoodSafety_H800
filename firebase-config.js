// Normally you do NOT edit this: open setup.html and paste your Firebase config there.
// (Advanced: you may also hard-code defaults below.)
(function(){
 let s={};try{s=JSON.parse(localStorage.getItem('h800_settings'))||{}}catch(e){}
 window.H800_SET=s;
 window.FIREBASE_CONFIG=s.firebase||{apiKey:'',authDomain:'',projectId:'',appId:''};
 window.APP_URL=s.appUrl||'';
})();
