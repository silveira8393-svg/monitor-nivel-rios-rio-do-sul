import React from 'react';
import { Waves, ExternalLink } from 'lucide-react';

export function Footer() {
  return <footer className="border-t border-slate-200 bg-white mt-5">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 flex flex-col sm:flex-row gap-5 justify-between items-start">
      <div><p className="flex items-center gap-2 text-sm font-extrabold text-sky-950"><Waves size={20} className="text-sky-700" /> SILVEIRA LAB</p>
        <p className="text-xs text-slate-500 mt-2 max-w-xl leading-relaxed">Ferramenta independente de acompanhamento hidrológico de Rio do Sul (SC). Utiliza medições provenientes da fonte indicada e não é um serviço oficial da Defesa Civil.</p></div>
      <div className="text-xs text-slate-500 space-y-2"><a href="https://defesacivil.riodosul.sc.gov.br/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sky-800 font-semibold">Defesa Civil de Rio do Sul <ExternalLink size={12} /></a>
        <p>Em emergências: Defesa Civil 199 · Bombeiros 193 · SAMU 192</p><p>Confira os avisos e siga as orientações oficiais.</p></div>
    </div>
  </footer>;
}
