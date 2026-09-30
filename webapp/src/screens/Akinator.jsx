import { Button } from '@maxhub/max-ui';
import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '../api.js';
import { bridge } from '../bridge.js';
import { launchConfetti } from '../confetti.js';
import { plural } from '../format.js';
import { EventCard, Loader, StateBlock } from '../ui.jsx';

const RECENT_KEY = 'resheno:recent-questions';
const RECENT_LIMIT = 10;
const DICE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function readRecent() {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function rememberQuestion(id) {
  try {
    const next = [id, ...readRecent().filter((x) => x !== id)].slice(0, RECENT_LIMIT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    return;
  }
}

function useDice(count, onDone) {
  const [rolling, setRolling] = useState(false);
  const [highlight, setHighlight] = useState(null);
  const [face, setFace] = useState(DICE[5]);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const roll = () => {
    if (rolling || count === 0) return;
    const winner = Math.floor(Math.random() * count);
    const ticks = count * 4 + winner;
    setRolling(true);
    bridge.haptic('medium');
    let delay = 0;
    for (let i = 0; i <= ticks; i += 1) {
      delay += 60 + i * 12;
      timers.current.push(
        setTimeout(() => {
          setHighlight(i % count);
          setFace(DICE[Math.floor(Math.random() * 6)]);
          bridge.haptic('select');
          if (i === ticks) {
            setRolling(false);
            bridge.haptic('success');
            onDone(winner);
          }
        }, delay)
      );
    }
  };

  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRolling(false);
    setHighlight(null);
  };

  return { roll, rolling, highlight, face, reset };
}

export function Akinator({ today, onOpen, onClose }) {
  const [answers, setAnswers] = useState([]);
  const [state, setState] = useState({ status: 'loading' });
  const [winner, setWinner] = useState(null);
  const results = state.status === 'done' ? state.data.results : [];

  const dice = useDice(results.length, (idx) => {
    setWinner(idx);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-event-idx="${idx}"]`);
        const rect = el?.getBoundingClientRect?.();
        const origin = rect
          ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
          : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        launchConfetti(origin);
      });
    });
  });

  const load = useCallback(async (nextAnswers) => {
    setState({ status: 'loading' });
    try {
      const data = await api.akinator({ answers: nextAnswers, avoid: readRecent() });
      if (!data.done) rememberQuestion(data.question.id);
      setState({ status: data.done ? 'done' : 'question', data });
    } catch (err) {
      setState({ status: 'error', error: err.message });
    }
  }, []);

  useEffect(() => {
    load([]);
  }, [load]);

  const answer = (value) => {
    bridge.haptic('light');
    const next = [...answers, { questionId: state.data.question.id, value }];
    setAnswers(next);
    load(next);
  };

  const restart = () => {
    dice.reset();
    setWinner(null);
    setAnswers([]);
    load([]);
  };

  return (
    <section className="screen">
      <div className="topline">
        <button type="button" className="back-btn" onClick={onClose}>
          <span className="back-btn__arrow" aria-hidden>←</span>
          <span>К афише</span>
        </button>
      </div>

      <header className="hero">
        <span className="overline">Найдём вместе</span>
        {state.status === 'question' && (
          <p className="text muted">
            Вопрос {state.data.step} из {state.data.maxSteps} · подходит {state.data.remaining}{' '}
            {plural(state.data.remaining, 'вариант', 'варианта', 'вариантов')}
          </p>
        )}
      </header>

      {state.status === 'loading' && <Loader text="Думаю…" />}

      {state.status === 'error' && (
        <StateBlock title="Не получилось загрузить вопрос" text={state.error} role="alert">
          <Button onClick={() => load(answers)}>Попробовать ещё раз</Button>
        </StateBlock>
      )}

      {state.status === 'question' && (
        <div className="card question" key={state.data.question.id}>
          <h1 className="h1">{state.data.question.text}</h1>
          <div className="answers">
            {state.data.question.options.map((o) => (
              <button key={o.value} type="button" className="answer" onClick={() => answer(o.value)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {state.status === 'done' && (
        <>
          <div className="hero">
            <h1 className="h1">
              {results.length === 1
                ? 'Нашёлся идеальный вариант'
                : `Осталось ${results.length} ${plural(results.length, 'вариант', 'варианта', 'вариантов')}`}
            </h1>
            <p className="text muted">
              {results.length > 1
                ? winner === null
                  ? 'Не можете выбрать? Бросьте кубик – он решит за вас.'
                  : 'Кубик сделал выбор! Нажмите на карточку, чтобы узнать подробности.'
                : 'Нажмите на карточку, чтобы узнать подробности.'}
            </p>
          </div>

          {results.length > 1 && (
            <div className="dice-row">
              <span className={`dice${dice.rolling ? ' dice_rolling' : ''}`} aria-hidden>
                {dice.face}
              </span>
              <button
                type="button"
                className="dice-btn"
                disabled={dice.rolling}
                onClick={() => { setWinner(null); dice.roll(); }}
              >
                {winner === null ? 'Выбери за меня' : 'Бросить ещё раз'}
              </button>
            </div>
          )}

          <div className="list" aria-live="polite">
            {results.map((e, i) => (
              <div
                key={e.id}
                data-event-idx={i}
                className={`pick${dice.highlight === i ? ' pick_hl' : ''}${winner === i ? ' pick_win' : ''}${winner !== null && winner !== i && !dice.rolling ? ' pick_dim' : ''}`}
              >
                <EventCard
                  event={e}
                  today={today}
                  onOpen={onOpen}
                  highlighted={dice.highlight === i || winner === i}
                  dimmed={winner !== null && winner !== i && !dice.rolling}
                />
              </div>
            ))}
          </div>

          {winner !== null && (
            <p className="text winner" role="status">
              Кубик выбрал: <strong>{results[winner].title}</strong>
            </p>
          )}

          <div className="row">
            {winner !== null && (
              <button type="button" className="btn-primary" onClick={() => onOpen(results[winner])}>
                Открыть выбранное
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={restart}>
              Попробовать снова
            </button>
          </div>
        </>
      )}
    </section>
  );
}