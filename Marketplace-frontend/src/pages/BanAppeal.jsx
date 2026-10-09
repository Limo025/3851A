import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import backgroundImg from '../img/well.jpg';
import '../css/styles/ban-appeal.css';

const APPEAL_EMAIL = import.meta.env.VITE_BAN_APPEAL_EMAIL || 'marketplace-support@newcastle.edu.au';

export default function BanAppeal() {
  const location = useLocation();
  const accountEmail = typeof location.state?.email === 'string' ? location.state.email : '';
  const banReason = typeof location.state?.reason === 'string' && location.state.reason.trim()
    ? location.state.reason.trim()
    : 'No specific reason was provided. Contact the Marketplace team for more information.';
  const subject = accountEmail
    ? `Marketplace ban appeal - ${accountEmail}`
    : 'Marketplace ban appeal';
  const emailHref = `mailto:${APPEAL_EMAIL}?subject=${encodeURIComponent(subject)}`;

  useEffect(() => {
    document.title = 'Appeal Account Ban | UON Marketplace';
  }, []);

  return (
    <main
      className="ban-appeal-page"
      style={{ backgroundImage: `url(${backgroundImg})` }}
    >
      <section className="ban-appeal-card" aria-labelledby="ban-appeal-title">
        <p className="ban-appeal-card__eyebrow">Account access</p>
        <h1 id="ban-appeal-title">Your account has been banned</h1>
        <p className="ban-appeal-card__intro">
          If you believe this decision should be reviewed, email the Marketplace team to submit an appeal.
        </p>

        <div className="ban-appeal-card__reason" role="status">
          <h2>Reason for your ban</h2>
          <p>{banReason}</p>
        </div>

        <a className="ban-appeal-card__email" href={emailHref}>{APPEAL_EMAIL}</a>

        <div className="ban-appeal-card__instructions">
          <h2>What to include</h2>
          <ul>
            <li>The email address connected to your Marketplace account.</li>
            <li>A clear explanation of why you believe the ban should be reconsidered.</li>
            <li>Any relevant context or evidence that may help the review.</li>
          </ul>
        </div>
        
        <Link className="ban-appeal-card__back" to="/login">Back to login</Link>
      </section>
    </main>
  );
}
