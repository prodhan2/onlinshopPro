import { useState } from 'react';
import { FaMapMarkerAlt, FaSearch, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

export default function LocationPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const popularCities = [
    "Dinajpur", "Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna",
    "Barisal", "Rangpur", "Mymensingh", "Comilla", "Bogra", "Jessore",
    "Narayanganj", "Gazipur", "Saidpur", "Thakurgaon", "Nilphamari", "Pabna"
  ];

  const filteredCities = popularCities.filter(city =>
    city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (city) => {
    setSelectedCity(city);
    // Save to localStorage or context
    localStorage.setItem('userLocation', city + ", Bangladesh");
    
    setTimeout(() => {
      navigate(-1); // Go back to previous page
    }, 400);
  };

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`
            );
            const data = await res.json();
            const city = data.address.city || data.address.district || "Dinajpur";
            handleSelect(city);
          } catch {
            alert("Could not detect location. Please select manually.");
          }
        },
        () => alert("Please allow location access.")
      );
    }
  };

  return (
    <div className="location-page">
      <div className="location-page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>
        <h1>Change Delivery Location</h1>
      </div>

      <div className="location-page-content">
        <button className="detect-location-btn" onClick={detectLocation}>
          <FaMapMarkerAlt /> Detect My Current Location
        </button>

        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search your city or area..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="cities-section">
          <h3>Popular Cities</h3>
          <div className="cities-grid">
            {filteredCities.map((city) => (
              <div
                key={city}
                className={`city-card ${selectedCity === city ? 'selected' : ''}`}
                onClick={() => handleSelect(city)}
              >
                <div className="city-icon-wrapper">
                  <FaMapMarkerAlt />
                </div>
                <div className="city-name">{city}</div>
                <div className="city-country">Bangladesh</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}