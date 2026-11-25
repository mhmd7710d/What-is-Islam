(function(){
  var btn=document.querySelector('.menu-btn'),nav=document.getElementById('nav');
  btn.addEventListener('click',function(){var o=nav.classList.toggle('open');btn.setAttribute('aria-expanded',o)});
  nav.addEventListener('click',function(e){if(e.target.tagName==='A'){nav.classList.remove('open');btn.setAttribute('aria-expanded','false')}});

  var form=document.getElementById('pt-form'),status=document.getElementById('pt-status'),out=document.getElementById('pt-out');
  var names=['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'];
  function nowMinutes(tz){
    try{
      var parts=new Intl.DateTimeFormat('en-GB',{timeZone:tz,hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date());
      var h=0,m=0;parts.forEach(function(p){if(p.type==='hour')h=+p.value%24;if(p.type==='minute')m=+p.value});
      return h*60+m;
    }catch(e){return null}
  }
  function fail(msg){out.innerHTML='';status.className='pt-err';status.textContent=msg}
  function load(city,country,method){
    status.className='';status.textContent='Loading prayer times...';out.innerHTML='';
    var url='https://api.aladhan.com/v1/timingsByCity?method='+encodeURIComponent(method)+'&city='+encodeURIComponent(city)+'&country='+encodeURIComponent(country);
    var ctl=('AbortController' in window)?new AbortController():null;
    var timer=setTimeout(function(){if(ctl)ctl.abort()},12000);
    fetch(url,ctl?{signal:ctl.signal}:{}).then(function(r){return r.json()}).then(function(j){
      clearTimeout(timer);
      if(j.code!==200||!j.data||!j.data.timings)throw new Error('notfound');
      var d=j.data,t=d.timings,tz=d.meta&&d.meta.timezone,cur=tz?nowMinutes(tz):null,nextIdx=-1;
      var mins=names.map(function(n){var p=t[n].slice(0,5).split(':');return +p[0]*60+ +p[1]});
      if(cur!==null){for(var i=0;i<mins.length;i++){if(i!==1&&mins[i]>cur){nextIdx=i;break}}}
      out.innerHTML=names.map(function(n,i){return '<div'+(i===nextIdx?' class="next"':'')+'><span>'+n+'</span><strong>'+t[n].slice(0,5)+'</strong></div>'}).join('');
      var mname=d.meta&&d.meta.method&&d.meta.method.name?d.meta.method.name:'selected method';
      status.className='';
      status.textContent=d.date.readable+' | '+d.date.hijri.day+' '+d.date.hijri.month.en+' '+d.date.hijri.year+' AH | '+city+(tz?' ('+tz+' time)':'')+' | Method: '+mname+(nextIdx>=0?' | Highlighted: next prayer.':(cur!==null?' | All of today\'s prayers have passed.':''));
    }).catch(function(e){
      clearTimeout(timer);
      if(e&&e.message==='notfound')fail('City not found. Check the spelling of the city and country (in English).');
      else if(e&&e.name==='AbortError')fail('The prayer-times service is taking too long. Please try again.');
      else fail('Could not load prayer times. Check your internet connection and try again.');
    });
  }
  form.addEventListener('submit',function(e){e.preventDefault();load(document.getElementById('pt-city').value.trim(),document.getElementById('pt-country').value.trim(),document.getElementById('pt-method').value)});
  load('Cairo','Egypt','5');
})();
