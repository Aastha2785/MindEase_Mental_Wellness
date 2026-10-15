import { ArrowLeft, BarChart3, Info, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const emotions = [
  { label: 'Happy', value: 60, className: 'emotion-happy', note: 'Positive or upbeat language' },
  { label: 'Sad', value: 15, className: 'emotion-sad', note: 'Low or sad feelings expressed' },
  { label: 'Stressed', value: 15, className: 'emotion-stressed', note: 'Pressure or overwhelm expressed' },
  { label: 'Angry', value: 10, className: 'emotion-angry', note: 'Frustration or anger expressed' },
];

export default function WeeklyAnalysis() {
  return (
    <section className="page-section">
      <div className="page-title-row">
        <div>
          <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to dashboard</Link>
          <div className="eyebrow"><span className="eyebrow-dot" /> YOUR WEEK AT A GLANCE</div>
          <h1>Weekly Analysis</h1>
          <p>Explore the four major emotions reflected in your eligible AI chatbot conversations this week.</p>
        </div>
        <span className="icon-tile purple page-title-icon"><BarChart3 size={24} /></span>
      </div>

      <div className="weekly-summary-grid">
        <article className="card weekly-summary-card">
          <span className="muted">Most represented emotion · sample only</span>
          <strong className="summary-value">Happy</strong>
          <p>In the connected version, these percentages will be calculated from your eligible mood-analysis records—not face scans or counselling messages.</p>
        </article>
        <article className="card weekly-summary-card">
          <span className="muted">Reporting period</span>
          <strong className="summary-value">Last 7 days</strong>
          <p>Days without a completed mood analysis will be treated as missing data, not as zero emotion.</p>
        </article>
      </div>

      <article className="card emotion-card">
        <div className="card-heading"><div><span className="icon-tile mint"><BarChart3 size={18} /></span><h2>Emotion breakdown</h2></div><span className="small-select">4 emotions</span></div>
        <p className="muted">Example percentages only — not your personal results.</p>
        <div className="emotion-chart">
          {emotions.map(emotion => (
            <div className="emotion-row" key={emotion.label}>
              <div className="emotion-label-line"><span>{emotion.label}</span><strong>{emotion.value}%</strong></div>
              <div className="emotion-track"><div className={`emotion-fill ${emotion.className}`} style={{ width: `${emotion.value}%` }} /></div>
              <span className="emotion-note">{emotion.note}</span>
            </div>
          ))}
        </div>
        <div className="chart-note"><Info size={16} /><span>Emotions are estimates inferred from text, not clinical measurements. The production chart will use your saved chatbot analysis data.</span></div>
      </article>

      <article className="card weekly-insight-card">
        <span className="icon-tile purple"><Sparkles size={18} /></span>
        <div><h2>Weekly reflection</h2><p>When real data is connected, this area will summarize meaningful changes across your week and suggest a small next step. It will not invent results when there is insufficient data.</p></div>
      </article>
    </section>
  );
}
