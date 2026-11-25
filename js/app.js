(function(){
  var btn=document.querySelector('.menu-btn'),nav=document.getElementById('nav');
  btn.addEventListener('click',function(){var o=nav.classList.toggle('open');btn.setAttribute('aria-expanded',o)});
  nav.addEventListener('click',function(e){if(e.target.tagName==='A'){nav.classList.remove('open');btn.setAttribute('aria-expanded','false')}});

  var form=document.getElementById('pt-form'),status=document.getElementById('pt-status'),out=document.getElementById('pt-out');
  var names=['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'];
  var API='https://api.aladhan.com/v1/timingsByCity';

  // Current date and time in the city's own time zone.
  function cityNow(tz){
    try{
      var p=new Intl.DateTimeFormat('en-GB',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date());
      var o={};p.forEach(function(x){o[x.type]=x.value});
      return {date:o.day+'-'+o.month+'-'+o.year,min:(+o.hour%24)*60+ +o.minute};
    }catch(e){return null}
  }
  function nextDay(ddmmyyyy){
    var s=ddmmyyyy.split('-'),d=new Date(Date.UTC(+s[2],+s[1]-1,+s[0]+1));
    return ('0'+d.getUTCDate()).slice(-2)+'-'+('0'+(d.getUTCMonth()+1)).slice(-2)+'-'+d.getUTCFullYear();
  }
  function toMin(s){var p=s.slice(0,5).split(':');return +p[0]*60+ +p[1]}
  function fail(msg){out.innerHTML='';status.className='pt-err';status.textContent=msg}
  function get(city,country,method,date,signal){
    var url=API+(date?'/'+date:'')+'?method='+encodeURIComponent(method)+'&city='+encodeURIComponent(city)+'&country='+encodeURIComponent(country);
    return fetch(url,signal?{signal:signal}:{}).then(function(r){return r.json()}).then(function(j){
      if(j.code!==200||!j.data||!j.data.timings)throw new Error('notfound');
      return j.data;
    });
  }
  function load(city,country,method){
    status.className='';status.textContent='Loading prayer times...';out.innerHTML='';
    var ctl=('AbortController' in window)?new AbortController():null;
    var sig=ctl?ctl.signal:null;
    var timer=setTimeout(function(){if(ctl)ctl.abort()},15000);
    var data,now,tomorrow=null;
    get(city,country,method,null,sig).then(function(d){
      data=d;var tz=d.meta&&d.meta.timezone;now=tz?cityNow(tz):null;
      // The API's default date may differ from the city's date near midnight: ask for the city's own date.
      if(now&&d.date.gregorian.date!==now.date)return get(city,country,method,now.date,sig).then(function(d2){data=d2});
    }).then(function(){
      var t=data.timings,mins=names.map(function(n){return toMin(t[n])}),nextIdx=-1;
      if(now){for(var i=0;i<mins.length;i++){if(i!==1&&mins[i]>now.min){nextIdx=i;break}}}
      if(now&&nextIdx<0){return get(city,country,method,nextDay(now.date),sig).then(function(d3){tomorrow=d3})}
    }).then(function(){
      clearTimeout(timer);
      var t=data.timings,tz=data.meta&&data.meta.timezone,mins=names.map(function(n){return toMin(t[n])}),nextIdx=-1,i;
      if(now){for(i=0;i<mins.length;i++){if(i!==1&&mins[i]>now.min){nextIdx=i;break}}}
      var html=names.map(function(n,k){return '<div'+(k===nextIdx?' class="next"':'')+'><span>'+n+'</span><strong>'+t[n].slice(0,5)+'</strong></div>'}).join('');
      var extra='';
      if(tomorrow){extra=' | All of today\'s prayers have passed. Next: Fajr tomorrow at '+tomorrow.timings.Fajr.slice(0,5)+' ('+tomorrow.date.readable+')'}
      else if(nextIdx>=0){extra=' | Highlighted: next prayer'}
      out.innerHTML=html;
      var mname=data.meta&&data.meta.method&&data.meta.method.name?data.meta.method.name:'selected method';
      status.className='';
      status.textContent=data.date.readable+' | '+data.date.hijri.day+' '+data.date.hijri.month.en+' '+data.date.hijri.year+' AH | '+city+(tz?' ('+tz+' time)':'')+' | Method: '+mname+extra;
    }).catch(function(e){
      clearTimeout(timer);
      if(e&&e.message==='notfound')fail('City not found. Check the spelling of the city and country (in English).');
      else if(e&&e.name==='AbortError')fail('The prayer-times service is taking too long. Please try again.');
      else fail('Could not load prayer times. Check your internet connection and try again.');
    });
  }
  form.addEventListener('submit',function(e){e.preventDefault();load(document.getElementById('pt-city').value.trim(),document.getElementById('pt-country').value.trim(),document.getElementById('pt-method').value)});
  window.__ptLoad=load;
  load('Cairo','Egypt','5');
})();
