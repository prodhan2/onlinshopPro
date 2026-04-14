import { useState } from 'react';
import { FaMapMarkerAlt, FaSearch, FaTimes, FaLocationArrow } from 'react-icons/fa';

export default function LocationModal({ isOpen, onClose, onLocationSelect }) {
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
    onLocationSelect(city + ", Bangladesh");
    setTimeout(onClose, 300); // Smooth close
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
            alert("Couldn't detect city. Please select manually.");
          }
        },
        () => alert("Please allow location access.")
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="location-modal-overlay">
      <div className="location-modal beautiful-modal">
        <div className="modal-header">
          <div>
            <h2>Change Delivery Location</h2>
            <p className="modal-subtitle">Where do you want to receive your orders?</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-body">
          {/* Auto Detect Button */}
          <button className="detect-location-btn" onClick={detectLocation}>
            <FaLocationArrow /> Detect My Current Location
          </button>

          {/* Search Bar */}
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search your city or area..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Cities Grid */}
          <div className="cities-section">
            <h3>Popular Delivery Cities</h3>
            <div className="cities-grid">
              {filteredCities.map((city) => (
                <div
                  key={city}
                  className={`city-card ${selectedCity === city ? 'selected' : ''}`}
                  onClick={() => handleSelect(city)}
                >
                  <div className="city-icon-wrapper">
                    <FaMapMarkerAlt className="city-icon" />
                  </div>
                  <div className="city-name">{city}</div>
                  <div className="city-country">Bangladesh</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}