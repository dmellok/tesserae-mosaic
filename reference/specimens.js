/*
 * The specimens: six dashboards composed from Mosaic components, drawn in every look. They are the
 * reference a look is judged against and the worked examples an author or an agent reads.
 *
 * Each is { id, name, html, css, js }. html is the page body (one .m root). css is the page's own
 * layout, a few lines and never colour or type: that is the look's job. js runs with ctx in scope
 * (ctx.data, ctx.errors, ctx.options, ctx.w, ctx.h, ctx.locale, ctx.tz), the contract a Tesserae
 * code page has. The page's own class names (t-clock, wb-bars, ...) are hooks for its script; a
 * look never styles them, so any dashboard built from the same components takes a look the same way.
 */

/** Open-Meteo, read the same way by every specimen that shows weather. */
const WX = `const COND={0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Dense drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",80:"Showers",81:"Showers",82:"Violent showers",95:"Thunderstorm"};
const readWx=(w)=>{if(!w||!w.current)return null;const O={tz:ctx.tz,locale:ctx.locale};
 const o={temp:Math.round(w.current.temperature_2m),kind:Mosaic.weatherKind(w.current.weather_code,w.current.is_day!==0),cond:COND[w.current.weather_code]||"",hi:null,lo:null,rise:null,set:null,hours:[]};
 if(w.daily){o.hi=Math.round(w.daily.temperature_2m_max[0]);o.lo=Math.round(w.daily.temperature_2m_min[0]);if(w.daily.sunrise){o.rise=Mosaic.timeParts(new Date(w.daily.sunrise[0]),O);o.set=Mosaic.timeParts(new Date(w.daily.sunset[0]),O);}}
 if(w.hourly){const now=Date.now();const s=Math.max(0,w.hourly.time.findIndex((x)=>new Date(x).getTime()>=now-3600e3));
  for(let i=s;i<w.hourly.time.length&&o.hours.length<12;i++)o.hours.push({temp:Math.round(w.hourly.temperature_2m[i]),rain:(w.hourly.precipitation_probability||[])[i]||0,tick:new Date(w.hourly.time[i]).toLocaleTimeString(ctx.locale||undefined,{hour:"numeric",timeZone:ctx.tz||undefined})});}
 return o;};
const wxMissing=()=>ctx.errors&&ctx.errors.wx?"Weather unavailable":"Set a location to see the weather";
/* A time as "6:58" with its "am" small, for a stat value. */
const hm=(t)=>t?Mosaic.esc(t.time)+(t.period?'<small class="m-clock__period">'+Mosaic.esc(t.period)+"</small>":""):"–";
`;

export const SPECIMENS = [
  {
    id: "today",
    name: "Today",
    html: `<main class="m"><div class="m-page">
  <header class="m-masthead"><span class="t-day"></span><span class="t-date"></span><span class="t-year"></span></header>
  <div class="m-hero"><div class="m-clock t-clock" data-fit></div></div>
  <section class="m-window t-wx m-hide-tiny" data-cap="Weather">
    <div class="m-row m-row--center t-row">
      <span class="m-iconbox t-icon"></span>
      <div class="m-stat m-stat--hero t-now"><span class="m-stat__label t-cond"></span><b class="m-stat__value t-temp"></b></div>
      <div class="m-stats m-fill t-stats m-hide-small">
        <div class="m-stat"><span class="m-stat__label">High</span><b class="m-stat__value t-hi"></b></div>
        <div class="m-stat"><span class="m-stat__label">Low</span><b class="m-stat__value t-lo"></b></div>
        <div class="m-stat"><span class="m-stat__label">Rain</span><b class="m-stat__value t-rain"></b></div>
      </div>
    </div>
  </section>
</div></main>`,
    css: `.t-row{height:100%}
.t-icon{align-self:stretch;height:auto}`,
    js: `${WX}
const q=(s)=>document.querySelector(s);const now=new Date();const O={tz:ctx.tz,locale:ctx.locale};
q(".t-day").textContent=Mosaic.date(now,"weekday",O);
q(".t-date").textContent=Mosaic.date(now,"day",O)+" "+Mosaic.date(now,"month",O);
q(".t-year").textContent=Mosaic.date(now,"year",O);
Mosaic.clock(q(".t-clock"),O);
const w=readWx(ctx.data.wx);
if(w){q(".t-icon").innerHTML=Mosaic.icon(w.kind,q(".t-icon"));q(".t-temp").textContent=w.temp+"°";q(".t-cond").textContent=w.cond;
 q(".t-hi").textContent=w.hi+"°";q(".t-lo").textContent=w.lo+"°";
 const wet=w.hours.reduce((a,x)=>Math.max(a,x.rain),0);q(".t-rain").textContent=wet+"%";}
else q(".t-wx").innerHTML='<div class="m-empty">'+Mosaic.esc(wxMissing())+"</div>";
await Mosaic.ready();`,
  },
  {
    id: "weather_board",
    name: "Weather board",
    html: `<main class="m"><div class="m-page">
  <div class="m-row wb-top">
    <div class="m-stat m-stat--hero m-fill wb-now"><span class="m-stat__label wb-cond"></span><b class="m-stat__value wb-temp" data-fit></b></div>
    <span class="m-iconbox wb-icon"></span>
  </div>
  <section class="m-window m-fill wb-hours m-hide-tiny" data-cap="Next 12 hours"><div class="wb-bars"></div></section>
  <div class="m-stats m-stats--wrap wb-stats m-hide-tiny">
    <div class="m-stat"><span class="m-stat__label">High</span><b class="m-stat__value wb-hi"></b></div>
    <div class="m-stat"><span class="m-stat__label">Low</span><b class="m-stat__value wb-lo"></b></div>
    <div class="m-stat"><span class="m-stat__label">Sunrise</span><b class="m-stat__value wb-rise"></b></div>
    <div class="m-stat"><span class="m-stat__label">Sunset</span><b class="m-stat__value wb-set"></b></div>
  </div>
</div></main>`,
    css: `.wb-top{flex:0 0 34%;min-height:0}
.wb-now{justify-content:flex-end}
.wb-temp{flex:1;min-height:0}
.wb-icon{height:100%}
.wb-bars{height:100%}
@container m (max-height:219px){.wb-top{flex:1}}`,
    js: `${WX}
const q=(s)=>document.querySelector(s);const w=readWx(ctx.data.wx);
if(!w){q(".m-page").innerHTML='<div class="m-empty m-fill">'+Mosaic.esc(wxMissing())+"</div>";await Mosaic.ready();}
else{q(".wb-temp").textContent=w.temp+"°";q(".wb-cond").textContent=w.cond;q(".wb-icon").innerHTML=Mosaic.icon(w.kind,q(".wb-icon"));
 q(".wb-hi").textContent=w.hi+"°";q(".wb-lo").textContent=w.lo+"°";q(".wb-rise").innerHTML=hm(w.rise);q(".wb-set").innerHTML=hm(w.set);
 await Mosaic.ready();
 const n=ctx.w<440?8:12;Mosaic.bars(q(".wb-bars"),w.hours.slice(0,n).map((x,i)=>({value:x.temp,label:x.temp+"°",tick:i?x.tick:"Now"})),{now:0});}`,
  },
  {
    id: "year_progress",
    name: "Year progress",
    html: `<main class="m"><div class="m-page">
  <header class="m-masthead"><span class="yp-year"></span><span class="yp-day"></span></header>
  <div class="m-fill yp-dots"></div>
  <div class="m-stats yp-stats">
    <div class="m-stat"><span class="m-stat__label">Gone</span><b class="m-stat__value yp-gone"></b></div>
    <div class="m-stat"><span class="m-stat__label">Days left</span><b class="m-stat__value yp-left"></b></div>
  </div>
  <div class="m-meter yp-meter"></div>
</div></main>`,
    css: ``,
    js: `const q=(s)=>document.querySelector(s);const now=new Date();const y=now.getFullYear();const start=new Date(y,0,1);
const days=Math.round((new Date(y+1,0,1)-start)/864e5);const doy=Math.floor((now-start)/864e5)+1;
q(".yp-year").textContent=y;q(".yp-day").textContent="Day "+doy+" of "+days;
q(".yp-gone").textContent=Math.round(100*doy/days)+"%";q(".yp-left").textContent=days-doy;
q(".yp-meter").style.setProperty("--m-value",(doy/days).toFixed(3));
await Mosaic.ready();Mosaic.dots(q(".yp-dots"),{total:days,done:doy-1});`,
  },
  {
    id: "countdown",
    name: "Countdown",
    html: `<main class="m"><div class="m-page">
  <header class="m-masthead"><span class="cd-what"></span><span class="cd-label"></span></header>
  <div class="m-hero"><div class="m-num cd-n" data-fit></div></div>
  <div class="m-row m-row--center cd-foot m-hide-tiny"><span class="m-iconbox cd-icon"></span><span class="m-fill cd-when"></span></div>
  <div class="m-meter cd-meter"></div>
</div></main>`,
    css: `.cd-icon{font-size:max(20px,calc(var(--m-u)*7))}`,
    js: `const q=(s)=>document.querySelector(s);const O={tz:ctx.tz,locale:ctx.locale};const now=new Date();
const m=/^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(String(ctx.options.date||""));const label=String(ctx.options.label||"").trim();
q(".cd-icon").innerHTML=Mosaic.icon("calendar",q(".cd-icon"));
if(!m){q(".cd-what").textContent="Countdown";q(".cd-label").textContent="";q(".cd-n").textContent="?";q(".cd-when").textContent="Set a date to count to";q(".cd-meter").remove();}
else{const target=new Date(+m[1],+m[2]-1,+m[3]);const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());const d=Math.round((target-today)/864e5);
 const unit=Math.abs(d)===1?"day":"days";
 q(".cd-what").textContent=d>0?unit+" until":d<0?unit+" since":"Today is";q(".cd-label").textContent=d===0?"":label;
 q(".cd-n").textContent=d===0?(label||"Today"):String(Math.abs(d));
 q(".cd-when").textContent=Mosaic.date(target,"long",O);
 /* How far through the last hundred days before it. */
 q(".cd-meter").style.setProperty("--m-value",d>0?Math.max(0,Math.min(1,1-d/100)).toFixed(3):"1");}
await Mosaic.ready();`,
  },
  {
    id: "headlines",
    name: "Headlines",
    html: `<main class="m"><div class="m-page">
  <header class="m-masthead"><span class="hl-title"></span><span class="hl-time"></span></header>
  <ol class="m-list m-fill hl-list"></ol>
</div></main>`,
    css: ``,
    js: `const q=(s)=>document.querySelector(s);const f=ctx.data.feed;
q(".hl-title").textContent=ctx.options.title||(f&&f.title)||"Headlines";
q(".hl-time").textContent=Mosaic.date(new Date(),"short",{tz:ctx.tz,locale:ctx.locale});
await Mosaic.ready();
const items=f&&f.items?f.items.map((i)=>i.title).filter(Boolean):[];
if(items.length)Mosaic.list(q(".hl-list"),items,{pad:true});
else q(".hl-list").outerHTML='<div class="m-empty m-fill">'+Mosaic.esc(ctx.errors&&ctx.errors.feed?"Feed unavailable":"No headlines yet")+"</div>";`,
  },
  {
    id: "quote",
    name: "Quote of the day",
    html: `<main class="m"><div class="m-page">
  <figure class="m-quote m-fill" data-cap="Quote of the day">
    <blockquote class="m-quote__text qt-text" data-fit="wrap"></blockquote>
    <figcaption class="m-quote__by qt-by"></figcaption>
  </figure>
</div></main>`,
    css: ``,
    js: `const q=(s)=>document.querySelector(s);
const QUOTES=[["Simplicity is the ultimate sophistication.","Leonardo da Vinci"],["The best time to plant a tree was twenty years ago. The second best time is now.","Proverb"],["Well begun is half done.","Aristotle"],["Little by little, one travels far.","J. R. R. Tolkien"],["Nature does not hurry, yet everything is accomplished.","Lao Tzu"],["What we think, we become.","Buddha"],["Act as if what you do makes a difference. It does.","William James"]];
const now=new Date();const doy=Math.floor((now-new Date(now.getFullYear(),0,1))/864e5);const [text,by]=QUOTES[doy%QUOTES.length];
q(".qt-text").textContent="\\u201C"+text+"\\u201D";q(".qt-by").textContent=by;
await Mosaic.ready();`,
  },
];
