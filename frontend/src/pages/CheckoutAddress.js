import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

function getSelectedAddressStorageKey() {
  return `selectedAddressId:${localStorage.getItem("email") || "user"}`;
}

function CheckoutAddress() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [address, setAddress] = useState({
    label: "",
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
    axios.get(`${API_BASE_URL}/api/addresses`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => {
        setSavedAddresses(res.data);
        const selectedAddressId = localStorage.getItem(getSelectedAddressStorageKey());
        const selectedAddress = res.data.find((item) => String(item.id) === selectedAddressId) || res.data[0];

        if (selectedAddress) {
          localStorage.setItem(getSelectedAddressStorageKey(), String(selectedAddress.id));
          setAddress((current) => ({
            ...current,
            ...selectedAddress,
            houseNumber: "",
            street: "",
            landmark: ""
          }));
        }
      })
      .catch((err) => {
        console.log(err.response || err);
      });
  }, [token]);

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

  const handleSave = async () => {
    const addressLine = [
      address.houseNumber,
      address.street,
      address.landmark
    ].filter(Boolean).join(", ");

    if (!address.fullName || !address.phone || !address.pincode || !address.houseNumber || !address.street || !address.city || !address.state) {
      alert("Please fill all address fields");
      return;
    }

    try {
      setIsSaving(true);
      const res = await axios.post(`${API_BASE_URL}/api/addresses`, {
        ...address,
        label: address.label || `Address ${savedAddresses.length + 1}`,
        addressLine
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setSavedAddresses((current) => [res.data, ...current]);
      localStorage.setItem(getSelectedAddressStorageKey(), String(res.data.id));
      alert("Address saved");
      navigate("/cart");
    } catch (err) {
      console.log(err.response || err);
      alert(err.response?.data?.message || err.response?.data || "Failed to save address");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectSavedAddress = (savedAddress) => {
    localStorage.setItem(getSelectedAddressStorageKey(), String(savedAddress.id));
    navigate("/cart");
  };

  const handleAddNewAddress = () => {
    setAddress({
      label: "",
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
          {savedAddresses.length > 0 && (
            <div className="saved-addresses-panel">
              <div className="saved-addresses-header">
                <div>
                  <p className="section-label">Saved Addresses</p>
                  <h3>Choose one or add new</h3>
                </div>
                <button className="checkout-secondary-button" onClick={handleAddNewAddress}>Add New Address</button>
              </div>

              <div className="saved-addresses-list">
                {savedAddresses.map((savedAddress) => (
                  <button
                    key={savedAddress.id}
                    className="saved-address-card"
                    onClick={() => handleSelectSavedAddress(savedAddress)}
                  >
                    <strong>{savedAddress.label || "Saved Address"}</strong>
                    <span>{savedAddress.fullName}</span>
                    <span>{savedAddress.addressLine}</span>
                    <span>{savedAddress.city}, {savedAddress.state} - {savedAddress.pincode}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="section-label">Address Details</p>
          <h3>Where should we deliver?</h3>
          <p className="address-helper">Save multiple addresses and switch between them any time.</p>

          <div className="address-grid">
            <input className="checkout-input" type="text" name="label" placeholder="Address Label (Home, Office)" value={address.label} onChange={handleChange} />
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
            <button className="checkout-primary-button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Address"}
            </button>
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
