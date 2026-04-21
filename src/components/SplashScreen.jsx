import logo from '../bstoreapp/assets/images/logo.png';
import './SplashScreen.css';

export default function SplashScreen({ fadeSplash, onTransitionEnd }) {
  return (
    <div 
      className={`splash-screen${fadeSplash ? ' fade-out' : ''}`}
      onTransitionEnd={onTransitionEnd}
    >
      <div className="splash-bg-accent"></div>
      <div className="splash-content">
        <img src={logo} alt="Beautiful Dinajpur Logo" className="splash-logo" />
        <h1 className="splash-title">Beautiful Dinajpur</h1>
        <p className="splash-subtitle">আপনার পাশে সব সময় বিউটিফুল দিনাজপুর</p>
      </div>
    </div>
  );
}