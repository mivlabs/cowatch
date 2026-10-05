import { PlateHeader } from '@/components/landing/PlateHeader';

const STEPS = [
  {
    title: 'Создайте комнату',
    desc: 'Придумайте название и, если хотите, сразу выберите фильм.',
  },
  {
    title: 'Отправьте код друзьям',
    desc: 'Шесть символов или ссылка из комнаты. Гости заходят без регистрации.',
  },
  {
    title: 'Смотрите вместе',
    desc: 'Хост включает видео, и у остальных оно идёт с того же кадра. Пауза и перемотка срабатывают у всех.',
  },
];

export function HowItWorks() {
  return (
    <section className="grid gap-5 md:grid-cols-[220px_1fr] md:gap-8">
      <PlateHeader label="Как это работает" title={<>Три шага до&nbsp;сеанса</>} />
      <ol className="grid min-w-0">
        {STEPS.map((step, i) => (
          <li key={step.title} className="grid grid-cols-[48px_1fr] gap-4 border-t border-line py-6 last:border-b">
            <span className="pt-2 font-mono text-sm text-gold">{String(i + 1).padStart(2, '0')}</span>
            <div className="grid min-w-0 gap-1.5">
              <h3 className="font-display text-[28px] font-medium italic leading-[1.05]">{step.title}</h3>
              <p className="max-w-[52ch] text-cream-dim">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
