import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function CheckoutAddress() {
  const navigate = useNavigate();
  const [isLocating, setIsLocating] = useState(false);
  const [address, setAddress] = useState({
    fullName: localStorage.getItem("name") || "",
    phone: "",
    pincode: "",
    houseNumber: "",
    street: "",
    landmark: "",
    addressLine: "",
    city: "",
    state: "",
    latitude: "",
    longitude: ""
  });

  useEffect(() => {
    const saved = localStorage.getItem("checkoutAddress");
    if (saved) {
      const parsed = JSON.parse(saved);
      setAddress((current) => ({
        ...current,
        ...parsed
      }));
    }
  }, []);

  const handleChange = (e) => {
    setAddress((current) => ({
      ...current,
      [e.target.name]: e.target.value
    }));
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported in this browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude.toFixed(6);
        const longitude = position.coords.longitude.toFixed(6);

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          const location = data.address || {};
          const city =
            location.city ||
            location.town ||
            location.village ||
            location.hamlet ||
            "";
          const state = location.state || "";
          const pincode = location.postcode || "";
          const street =
            location.road ||
            location.suburb ||
            location.neighbourhood ||
            location.city_district ||
            location.county ||
            "";
          const houseNumber = location.house_number || "";
          const addressLine = [houseNumber, street].filter(Boolean).join(", ");

          setAddress((current) => ({
            ...current,
            latitude,
            longitude,
            city: city || current.city,
            state: state || current.state,
            pincode: pincode || current.pincode,
            houseNumber: houseNumber || current.houseNumber,
            street: street || current.street,
            addressLine: addressLine || current.addressLine
          }));
        } catch (error) {
          setAddress((current) => ({
            ...current,
            latitude,
            longitude
          }));
          alert("Location pinned, but city/state/pincode could not be fetched automatically.");
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        alert("Unable to fetch current location");
      }
    );
  };

  const mapUrl = useMemo(() => {
    if (!address.latitude || !address.longitude) {
      return "";
    }

    const lat = Number(address.latitude);
    const lon = Number(address.longitude);
    const delta = 0.01;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - delta}%2C${lat - delta}%2C${lon + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lon}`;
  }, [address.latitude, address.longitude]);

  const handleSave = () => {
    const addressLine = [
      address.houseNumber,
      address.street,
      address.landmark
    ].filter(Boolean).join(", ");

    if (!address.fullName || !address.phone || !address.pincode || !address.houseNumber || !address.street || !address.city || !address.state) {
      alert("Please fill all address fields");
      return;
    }

    localStorage.setItem("checkoutAddress", JSON.stringify({
      ...address,
      addressLine
    }));
    alert("Address saved");
    navigate("/cart");
  };

  return (
    <div className="address-shell">
      <div className="address-topbar">
        <div>
          <p className="checkout-eyebrow">Checkout</p>
          <h2 className="checkout-title">Add Delivery Address</h2>
        </div>
        <Link to="/cart" className="checkout-link">Back to Cart</Link>
      </div>

      <div className="address-layout">
        <section className="address-form-card">
          <p className="section-label">Address Details</p>
          <h3>Where should we deliver?</h3>
          <p className="address-helper">Save the address once. We’ll reuse it for the current order.</p>

          <div className="address-grid">
            <input className="checkout-input" type="text" name="fullName" placeholder="Full Name" value={address.fullName} onChange={handleChange} />
            <input className="checkout-input" type="text" name="phone" placeholder="Phone Number" value={address.phone} onChange={handleChange} />
            <input className="checkout-input" type="text" name="houseNumber" placeholder="House / Flat Number" value={address.houseNumber} onChange={handleChange} />
            <input className="checkout-input" type="text" name="street" placeholder="Street / Area" value={address.street} onChange={handleChange} />
            <input className="checkout-input" type="text" name="landmark" placeholder="Landmark" value={address.landmark} onChange={handleChange} />
            <input className="checkout-input" type="text" name="pincode" placeholder="Pincode" value={address.pincode} onChange={handleChange} />
            <input className="checkout-input" type="text" name="city" placeholder="City" value={address.city} onChange={handleChange} />
            <input className="checkout-input" type="text" name="state" placeholder="State" value={address.state} onChange={handleChange} />
          </div>

          <div className="address-actions">
            <button className="checkout-secondary-button" onClick={handleUseCurrentLocation} disabled={isLocating}>
              {isLocating ? "Locating..." : "Use Current Location"}
            </button>
            <button className="checkout-primary-button" onClick={handleSave}>Save Address</button>
          </div>
        </section>

        <section className="address-map-card">
          <p className="section-label">Pinned Location</p>
          <h3>Map Preview</h3>
          {address.latitude && address.longitude ? (
            <>
              <p className="address-helper">Lat: {address.latitude} | Lon: {address.longitude}</p>
              <iframe
                title="Current Location"
                src={mapUrl}
                width="100%"
                height="320"
                className="address-map"
              />
            </>
          ) : (
            <div className="address-map-empty">
              <p>Use current location to pin your delivery point on the map.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default CheckoutAddress;
