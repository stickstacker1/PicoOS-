import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calculator, CalendarCheck, BookOpen, Globe2, Wallet, Settings,
  BatteryMedium, Wifi, ArrowUp, ArrowDown, ArrowLeft, ArrowRight
} from 'lucide-react';

export default function PicoCalcSimulator() {
  // OS State
  const [app, setApp] = useState('home');
  const [time, setTime] = useState(new Date());
  
  // Navigation State
  const [homeCursor, setHomeCursor] = useState(0);
  const [calcCursor, setCalcCursor] = useState({ r: 0, c: 0 });
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcEq, setCalcEq] = useState('');
  
  // App Data State
  const [notes, setNotes] = useState([]);
  const [currentNote, setCurrentNote] = useState('');
  const [isTypingNote, setIsTypingNote] = useState(false);

  const apps = [
    { id: 'calc', name: 'ProCalc', icon: Calculator, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { id: 'ledger', name: 'Ledger', icon: Wallet, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { id: 'agenda', name: 'Agenda', icon: CalendarCheck, color: 'text-sky-400', bg: 'bg-sky-400/10' },
    { id: 'notes', name: 'Notes', icon: BookOpen, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { id: 'worldclock', name: 'World Time', icon: Globe2, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
    { id: 'settings', name: 'Settings', icon: Settings, color: 'text-slate-400', bg: 'bg-slate-400/10' },
  ];

  const calcGrid = [
    ['7', '8', '9', '/'],
    ['4', '5', '6', '*'],
    ['1', '2', '3', '-'],
    ['C', '0', '=', '+']
  ];

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- HARDWARE INPUT LOGIC ---
  const handleKeyPlay = useCallback((key) => {
    // Global Navigation
    if (key === 'ESCAPE') {
      setApp('home');
      setIsTypingNote(false);
      return;
    }

    if (app === 'home') {
      if (key === 'UP') setHomeCursor(c => (c >= 3 ? c - 3 : c));
      if (key === 'DOWN') setHomeCursor(c => (c < 3 ? c + 3 : c));
      if (key === 'LEFT') setHomeCursor(c => (c % 3 !== 0 ? c - 1 : c));
      if (key === 'RIGHT') setHomeCursor(c => (c % 3 !== 2 ? c + 1 : c));
      if (key === 'ENTER') setApp(apps[homeCursor].id);
    } 
    else if (app === 'calc') {
      if (key === 'UP') setCalcCursor(c => ({ ...c, r: (c.r - 1 + 4) % 4 }));
      if (key === 'DOWN') setCalcCursor(c => ({ ...c, r: (c.r + 1) % 4 }));
      if (key === 'LEFT') setCalcCursor(c => ({ ...c, c: (c.c - 1 + 4) % 4 }));
      if (key === 'RIGHT') setCalcCursor(c => ({ ...c, c: (c.c + 1) % 4 }));
      
      if (key === 'ENTER') {
        const btn = calcGrid[calcCursor.r][calcCursor.c];
        processCalcInput(btn);
      }
      
      // Allow physical PC keyboard typing for calc
      if (/[0-9+\-*/=cC]|Enter|Backspace/.test(key)) {
        let mapped = key;
        if (key === 'Enter') mapped = '=';
        if (key === 'Backspace' || key.toLowerCase() === 'c') mapped = 'C';
        processCalcInput(mapped);
      }
    }
    else if (app === 'notes') {
      if (key === 'ENTER') {
        if (isTypingNote && currentNote.trim()) {
          setNotes(prev => [...prev, currentNote]);
          setCurrentNote('');
          setIsTypingNote(false);
        } else {
          setIsTypingNote(true);
        }
      }
      // Very basic PC typing support for the simulation
      else if (key.length === 1 && isTypingNote) {
        setCurrentNote(prev => prev + key);
      } else if (key === 'Backspace' && isTypingNote) {
        setCurrentNote(prev => prev.slice(0, -1));
      }
    }
  }, [app, homeCursor, calcCursor, calcDisplay, calcEq, isTypingNote, currentNote]);

  const processCalcInput = (btn) => {
    if (btn.toUpperCase() === 'C') {
      setCalcDisplay('0'); setCalcEq('');
    } else if (['/', '*', '-', '+'].includes(btn)) {
      setCalcEq(calcDisplay + ' ' + btn);
      setCalcDisplay('0');
    } else if (btn === '=') {
      try {
        const cleanEq = (calcEq + ' ' + calcDisplay).replace(/[^-()\d/*+.]/g, '');
        // eslint-disable-next-line no-new-func
        let res = new Function('return ' + cleanEq)();
        if (!Number.isInteger(res)) res = res.toFixed(4).replace(/\.?0+$/, '');
        setCalcDisplay(String(res));
        setCalcEq('');
      } catch {
        setCalcDisplay('Error');
      }
    } else {
      setCalcDisplay(prev => (prev === '0' || prev === 'Error') ? btn : prev + btn);
    }
  };

  // Bind PC Keyboard
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeElement = document.activeElement;
      if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') return;
      
      const keyMap = {
        'ArrowUp': 'UP', 'ArrowDown': 'DOWN', 'ArrowLeft': 'LEFT', 'ArrowRight': 'RIGHT',
        'Enter': 'ENTER', 'Escape': 'ESCAPE', 'Backspace': 'Backspace'
      };
      
      if (keyMap[e.key]) {
        e.preventDefault();
        handleKeyPlay(keyMap[e.key]);
      } else if (e.key.length === 1) {
        handleKeyPlay(e.key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPlay]);

  return (
    <div className="min-h-screen bg-slate-200 flex items-center justify-center py-10 font-sans selection:bg-none">
      
      {/* --- PHYSICAL DEVICE SHELL --- */}
      <div className="relative w-[400px] h-[780px] bg-[#3a4146] rounded-3xl shadow-2xl border-[2px] border-[#2a2f33] flex flex-col items-center pb-6">
        
        {/* Device Branding Header */}
        <div className="w-full flex justify-between items-center px-5 pt-4 pb-2">
          <div className="border border-white/20 rounded-full px-3 py-0.5 flex items-center shadow-inner">
            <span className="text-white/80 text-xs font-bold tracking-tight">clockwork</span>
          </div>
          <span className="text-white/70 text-[10px] font-semibold tracking-wider">ON/OFF</span>
        </div>

        {/* --- LCD SCREEN BEZEL --- */}
        <div className="relative w-[360px] h-[300px] bg-[#111] rounded shadow-inner mb-4 flex items-center justify-center overflow-hidden border-[8px] border-[#181a1c]">
          
          {/* Vertical Branding */}
          <div className="absolute right-2 top-0 bottom-0 flex flex-col justify-center items-center pointer-events-none z-50">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] mb-2"></div>
            <span className="text-white/50 text-[10px] tracking-widest font-mono rotate-90 origin-center whitespace-nowrap translate-y-8">
              PicoCalc
            </span>
          </div>

          {/* SIMULATED OS DISPLAY */}
          <div className="w-[300px] h-[225px] bg-neutral-950 text-white relative flex flex-col mr-6 rounded-sm shadow-[0_0_15px_rgba(0,0,0,1)] overflow-hidden">
            
            {/* Status Bar */}
            <div className="h-5 bg-neutral-900 border-b border-neutral-800 flex justify-between items-center px-2 text-[9px] font-mono text-sky-400 shrink-0">
              <span className="flex items-center gap-1"><Wifi size={8} /> OS_WIFI</span>
              <span className="font-bold">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="flex items-center gap-1">85% <BatteryMedium size={10} /></span>
            </div>

            {/* App View */}
            <div className="flex-1 overflow-hidden relative">
              
              {app === 'home' && (
                <div className="h-full flex flex-col p-2">
                  <div className="grid grid-cols-3 gap-y-4 gap-x-2 mt-2">
                    {apps.map((a, i) => {
                      const isSelected = homeCursor === i;
                      return (
                        <div key={a.id} className="flex flex-col items-center justify-center gap-1 relative z-10">
                          {isSelected && <div className="absolute inset-0 bg-white/10 rounded-xl -m-1 border border-white/20"></div>}
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center relative z-10 ${a.bg} border border-neutral-800`}>
                            <a.icon className={a.color} size={22} />
                          </div>
                          <span className={`text-[9px] font-medium relative z-10 ${isSelected ? 'text-white' : 'text-slate-400'}`}>{a.name}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-auto text-center text-[8px] text-neutral-600 font-mono pb-1">USE D-PAD TO NAVIGATE</div>
                </div>
              )}

              {app === 'calc' && (
                <div className="h-full flex flex-col p-2 bg-neutral-950">
                  <div className="h-14 bg-neutral-900 rounded-lg p-2 flex flex-col justify-end items-end mb-2 border border-neutral-800 shadow-inner">
                    <span className="text-neutral-500 text-[10px] font-mono h-4">{calcEq}</span>
                    <span className="text-2xl font-light tracking-tight truncate w-full text-right font-mono text-white">
                      {calcDisplay}
                    </span>
                  </div>
                  <div className="flex-1 grid grid-rows-4 gap-1">
                    {calcGrid.map((row, r) => (
                      <div key={r} className="grid grid-cols-4 gap-1">
                        {row.map((btn, c) => {
                          const isCursor = calcCursor.r === r && calcCursor.c === c;
                          const isOp = ['/','*','-','+','='].includes(btn);
                          return (
                            <div key={c} className={`flex items-center justify-center rounded text-sm font-bold
                              ${isCursor ? 'bg-white text-black ring-2 ring-sky-500' : 
                                isOp ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 
                                'bg-neutral-900 border border-neutral-800 text-white'}`}
                            >
                              {btn}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {app === 'notes' && (
                <div className="h-full flex flex-col bg-neutral-950">
                  <div className="px-2 py-1 bg-yellow-500/20 border-b border-yellow-500/30 text-yellow-500 text-[10px] font-bold">SCRATCHPAD</div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {notes.map((n, i) => (
                      <div key={i} className="text-xs text-slate-300 border-l-2 border-yellow-500 pl-2 py-0.5">{n}</div>
                    ))}
                    {isTypingNote && (
                      <div className="text-xs text-white border-l-2 border-sky-500 pl-2 py-0.5 flex">
                        {currentNote}<div className="w-1.5 h-3.5 bg-sky-500 ml-0.5 animate-pulse"></div>
                      </div>
                    )}
                  </div>
                  <div className="p-1 bg-neutral-900 text-center text-[8px] text-neutral-500 border-t border-neutral-800">
                    Press ENTER to {isTypingNote ? 'Save' : 'Write'}
                  </div>
                </div>
              )}

              {['ledger', 'agenda', 'worldclock', 'settings'].includes(app) && (
                <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                  <Settings className="text-neutral-700 mb-2" size={32} />
                  <p className="text-xs text-white font-bold mb-1">{apps.find(a => a.id === app)?.name}</p>
                  <p className="text-[9px] text-neutral-500">App module not loaded in ROM.</p>
                  <p className="text-[8px] text-neutral-600 mt-4 border border-neutral-800 px-2 py-1 rounded bg-neutral-900">Press ESC to return</p>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* --- PHYSICAL KEYBOARD AREA --- */}
        <div className="w-full px-4 flex gap-2">
          
          {/* D-Pad Block */}
          <div className="w-[100px] h-[95px] bg-[#2a2e31] rounded-2xl border-[2px] border-[#1f2225] shadow-inner p-1 relative flex items-center justify-center shrink-0">
             <div className="relative w-[70px] h-[70px]">
               {/* Up */}
               <button onClick={() => handleKeyPlay('UP')} className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-8 bg-[#1f2225] rounded-t border border-[#444] text-white flex items-start justify-center pt-1 active:bg-[#111]"><ArrowUp size={14}/></button>
               {/* Down */}
               <button onClick={() => handleKeyPlay('DOWN')} className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-8 bg-[#1f2225] rounded-b border border-[#444] text-white flex items-end justify-center pb-1 active:bg-[#111]"><ArrowDown size={14}/></button>
               {/* Left */}
               <button onClick={() => handleKeyPlay('LEFT')} className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-6 bg-[#1f2225] rounded-l border border-[#444] text-white flex items-center justify-start pl-1 active:bg-[#111]"><ArrowLeft size={14}/></button>
               {/* Right */}
               <button onClick={() => handleKeyPlay('RIGHT')} className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-6 bg-[#1f2225] rounded-r border border-[#444] text-white flex items-center justify-end pr-1 active:bg-[#111]"><ArrowRight size={14}/></button>
               {/* Center Block */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-[#1f2225] rounded-sm pointer-events-none"></div>
             </div>
          </div>

          {/* Top Function Keys Block (Right of DPad) */}
          <div className="flex-1 flex flex-col gap-1.5 justify-start pt-1">
            <div className="flex justify-between gap-1">
              <Key main="F1" sub="F6" type="func" />
              <Key main="F2" sub="F7" type="func" />
              <Key main="F3" sub="F8" type="func" />
              <Key main="F4" sub="F9" type="func" />
              <Key main="F5" sub="F10" type="func" />
            </div>
            <div className="flex justify-between gap-1">
              <Key main="Esc" sub="Brk" type="func" onClick={() => handleKeyPlay('ESCAPE')} />
              <Key main="Tab" sub="Home" type="func" />
              <Key main="CapsLK" type="func" />
              <Key main="Del" sub="End" type="func" />
              <Key main="<-Back" type="func" onClick={() => handleKeyPlay('Backspace')} />
            </div>
            <div className="flex justify-between gap-1">
              <Key main="`" sub="~" />
              <Key main="/ ?" />
              <Key main="\ |" />
              <Key main="- _" />
              <Key main="= +" />
              <Key main="[ {" />
              <Key main="] }" />
            </div>
          </div>
        </div>

        {/* Main QWERTY Block */}
        <div className="w-full px-4 flex flex-col gap-1.5 mt-2">
          {/* Numbers */}
          <div className="flex justify-between gap-1">
            <Key main="1" sub="!" subColor="text-green-400" />
            <Key main="2" sub="@" subColor="text-green-400" />
            <Key main="3" sub="#" subColor="text-green-400" />
            <Key main="4" sub="$" subColor="text-green-400" />
            <Key main="5" sub="%" subColor="text-green-400" />
            <Key main="6" sub="^" subColor="text-green-400" />
            <Key main="7" sub="&" subColor="text-green-400" />
            <Key main="8" sub="*" subColor="text-green-400" />
            <Key main="9" sub="(" subColor="text-green-400" />
            <Key main="0" sub=")" subColor="text-green-400" />
          </div>
          {/* QWERTY */}
          <div className="flex justify-between gap-1">
            <Key main="Q" onClick={() => handleKeyPlay('Q')} />
            <Key main="W" onClick={() => handleKeyPlay('W')} />
            <Key main="E" onClick={() => handleKeyPlay('E')} />
            <Key main="R" onClick={() => handleKeyPlay('R')} />
            <Key main="T" onClick={() => handleKeyPlay('T')} />
            <Key main="Y" onClick={() => handleKeyPlay('Y')} />
            <Key main="U" onClick={() => handleKeyPlay('U')} />
            <Key main="I" sub="Ins" subColor="text-yellow-500" onClick={() => handleKeyPlay('I')} />
            <Key main="O" onClick={() => handleKeyPlay('O')} />
            <Key main="P" onClick={() => handleKeyPlay('P')} />
          </div>
          {/* ASDF */}
          <div className="flex gap-1">
            <div className="flex-1 flex justify-between gap-1">
              <Key main="A" onClick={() => handleKeyPlay('A')} />
              <Key main="S" onClick={() => handleKeyPlay('S')} />
              <Key main="D" onClick={() => handleKeyPlay('D')} />
              <Key main="F" onClick={() => handleKeyPlay('F')} />
              <Key main="G" onClick={() => handleKeyPlay('G')} />
              <Key main="H" onClick={() => handleKeyPlay('H')} />
              <Key main="J" onClick={() => handleKeyPlay('J')} />
              <Key main="K" onClick={() => handleKeyPlay('K')} />
              <Key main="L" onClick={() => handleKeyPlay('L')} />
            </div>
            {/* Double height Enter placeholder */}
            <div className="w-[32px]"></div> 
          </div>
          {/* ZXCV */}
          <div className="flex gap-1 relative">
            <div className="flex-1 flex justify-start gap-[5px]">
              <Key main="Z" onClick={() => handleKeyPlay('Z')} />
              <Key main="X" onClick={() => handleKeyPlay('X')} />
              <Key main="C" onClick={() => handleKeyPlay('C')} />
              <Key main="V" onClick={() => handleKeyPlay('V')} />
              <Key main="B" sub="☀" subColor="text-yellow-500" onClick={() => handleKeyPlay('B')} />
              <Key main="N" onClick={() => handleKeyPlay('N')} />
              <Key main="M" onClick={() => handleKeyPlay('M')} />
              <Key main="," sub="<" subColor="text-green-400" />
              <Key main="." sub=">" subColor="text-green-400" />
            </div>
            {/* Absolute positioned Enter key to span two rows */}
            <button 
              onClick={() => handleKeyPlay('ENTER')}
              className="absolute right-0 bottom-0 w-[33px] h-[66px] bg-[#2a2e31] rounded-[4px] border-b-[2px] border-r-[1px] border-l-[1px] border-[#181a1c] border-t border-t-white/10 flex flex-col items-center justify-end pb-2 active:translate-y-[1px] active:border-b-[1px] transition-all z-10 shadow-[0_4px_0_#181a1c,inset_0_1px_1px_rgba(255,255,255,0.1)]"
            >
              <span className="text-white text-[10px] flex items-center font-bold">↵<br/>Enter</span>
            </button>
          </div>
          {/* Bottom Row */}
          <div className="flex gap-1">
            <Key main="Shift" type="wide" subColor="text-green-400" />
            <Key main="Ctrl" type="wide" />
            <Key main="Alt" type="wide" subColor="text-yellow-500" />
            <button onClick={() => handleKeyPlay(' ')} className="flex-[3] h-8 bg-[#2a2e31] rounded-[4px] border-b-[2px] border-r-[1px] border-l-[1px] border-[#181a1c] border-t border-t-white/10 active:translate-y-[1px] active:border-b-[1px] shadow-[0_4px_0_#181a1c,inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center justify-center relative">
              <span className="text-yellow-500 text-[8px] absolute top-1 right-2">💡</span>
            </button>
            <Key main=";" subColor="text-green-400" />
            <Key main="'" sub='"' subColor="text-green-400" />
            <Key main="Shift" type="wide" subColor="text-green-400" />
          </div>
        </div>

      </div>
    </div>
  );
}

// Subcomponent: Hardware Key Profile
function Key({ main, sub, subColor = "text-green-400", type = "normal", onClick }) {
  let wClass = "w-[33px]";
  let hClass = "h-[28px]";
  
  if (type === "func") {
    wClass = "flex-1"; hClass = "h-[24px]";
  } else if (type === "wide") {
    wClass = "flex-1"; hClass = "h-8";
  } else if (type === "normal") {
    hClass = "h-8";
  }

  return (
    <button 
      onClick={onClick}
      className={`${wClass} ${hClass} shrink-0 bg-[#2a2e31] rounded-[4px] border-b-[2px] border-r-[1px] border-l-[1px] border-[#181a1c] border-t border-t-white/10 flex flex-col items-center justify-center active:translate-y-[1px] active:border-b-[1px] transition-all shadow-[0_4px_0_#181a1c,inset_0_1px_1px_rgba(255,255,255,0.1)] relative`}
    >
      <div className="flex gap-1 items-baseline">
        {main && <span className={`text-white font-medium ${type==='func' ? 'text-[9px]' : 'text-[11px]'}`}>{main}</span>}
        {sub && <span className={`${subColor} font-bold ${type==='func' ? 'text-[8px]' : 'text-[9px]'}`}>{sub}</span>}
      </div>
    </button>
  );
}