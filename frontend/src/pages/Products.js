import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";

const topLinks = ["AI", "ALL", "MEN", "WOMEN"];
const promoLinks = ["Hot Trends", "Top Rated"];
const defaultSizeOptions = ["XS", "S", "M", "L", "XL", "XXL", "28", "30", "32", "34", "38", "40", "42", "48"];
const defaultColorOptions = ["Black", "White", "Blue", "Pink", "Green", "Red", "Brown", "Grey"];
const GUEST_CART_KEY = "guestCartItems";

function getResolvedStock(product) {
  return Number.isFinite(Number(product?.stock)) ? Math.max(Number(product.stock), 0) : 10;
}

function getMaxCartQuantity(product) {
  const stock = getResolvedStock(product);
  if (stock <= 0) {
    return 0;
  }
  return stock > 1 ? stock - 1 : 1;
}

function splitValues(value) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getPrimaryImage(imageUrl) {
  return splitValues(imageUrl)[0] || "";
}

function dataUrlToFile(dataUrl, fileName) {
  const [header, content] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const binary = window.atob(content);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], fileName, { type: mimeType });
}

function IconButton({ to, label, count, children }) {
  return (
    <Link to={to} className="header-icon-link" aria-label={label}>
      <span className="header-icon-shape" aria-hidden="true">
        {children}
      </span>
      {typeof count === "number" && count > 0 && <span className="header-icon-count">{count}</span>}
    </Link>
  );
}

function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [stylePhoto, setStylePhoto] = useState(null);
  const [stylePreview, setStylePreview] = useState("");
  const [styleAnalysis, setStyleAnalysis] = useState(null);
  const [styleError, setStyleError] = useState("");
  const [analyzingStyle, setAnalyzingStyle] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraHint, setCameraHint] = useState("Center your face inside the green guide.");
  const [faceAligned, setFaceAligned] = useState(false);
  const [supportsFaceDetector, setSupportsFaceDetector] = useState(true);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [pendingProductIds, setPendingProductIds] = useState([]);
  const [cartIds, setCartIds] = useState([]);
  const [cartQuantities, setCartQuantities] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [activeTopTab, setActiveTopTab] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState({
    gender: "",
    priceRange: "",
    size: "",
    category: "",
    color: ""
  });
  const [quickFilter, setQuickFilter] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);
  const [showColorOptions, setShowColorOptions] = useState(false);
  const colorFilterRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraCanvasRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  useEffect(() => {
    if (!stylePhoto) {
      setStylePreview("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(stylePhoto);
    setStylePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [stylePhoto]);

  useEffect(() => {
    if (!showCamera) {
      setCameraReady(false);
      setFaceAligned(false);
      setCameraHint("Center your face inside the green guide.");

      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }

      return undefined;
    }

    let mounted = true;

    const openCamera = async () => {
      try {
        setCameraError("");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 720 },
            height: { ideal: 960 }
          },
          audio: false
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        cameraStreamRef.current = stream;
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          await cameraVideoRef.current.play();
        }
      } catch (err) {
        console.log("Camera access error:", err);
        setCameraError("Camera access was blocked. Please allow camera permission or upload a photo instead.");
      }
    };

    openCamera();

    return () => {
      mounted = false;
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
    };
  }, [showCamera]);

  useEffect(() => {
    if (!showCamera || !cameraReady || !cameraVideoRef.current) {
      return undefined;
    }

    if (!("FaceDetector" in window)) {
      setSupportsFaceDetector(false);
      setFaceAligned(true);
      setCameraHint("Align your face inside the guide, then tap capture.");
      return undefined;
    }

    setSupportsFaceDetector(true);
    const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });

    const intervalId = window.setInterval(async () => {
      const video = cameraVideoRef.current;
      if (!video || video.readyState < 2) {
        return;
      }

      try {
        const faces = await detector.detect(video);
        if (!faces.length) {
          setFaceAligned(false);
          setCameraHint("Move closer and keep your face inside the green guide.");
          return;
        }

        const { boundingBox } = faces[0];
        const videoWidth = video.videoWidth || 1;
        const videoHeight = video.videoHeight || 1;
        const guide = {
          left: videoWidth * 0.23,
          right: videoWidth * 0.77,
          top: videoHeight * 0.12,
          bottom: videoHeight * 0.88,
          width: videoWidth * 0.54,
          height: videoHeight * 0.76
        };
        const centerX = boundingBox.x + (boundingBox.width / 2);
        const centerY = boundingBox.y + (boundingBox.height / 2);
        const widthFits = boundingBox.width >= guide.width * 0.42 && boundingBox.width <= guide.width * 0.94;
        const heightFits = boundingBox.height >= guide.height * 0.35 && boundingBox.height <= guide.height * 0.9;
        const centered =
          centerX >= guide.left &&
          centerX <= guide.right &&
          centerY >= guide.top &&
          centerY <= guide.bottom;
        const aligned = centered && widthFits && heightFits;

        setFaceAligned(aligned);
        setCameraHint(
          aligned
            ? "Face aligned. You can capture now."
            : "Adjust until your full face sits neatly inside the guide."
        );
      } catch (err) {
        console.log("Face detection error:", err);
        setSupportsFaceDetector(false);
        setFaceAligned(true);
        setCameraHint("Align your face inside the guide, then tap capture.");
      }
    }, 450);

    return () => window.clearInterval(intervalId);
  }, [showCamera, cameraReady]);

  useEffect(() => {
    axios.get(apiUrl("/api/products"))
      .then((res) => {
        setProducts(res.data);
      })
      .catch((err) => {
        console.log("Error fetching products:", err);
      });
  }, []);

  useEffect(() => {
    if (!token) {
      setWishlistIds([]);
      return;
    }

    axios.get(apiUrl("/api/wishlist"), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => {
        setWishlistIds(res.data.map((product) => product.id));
      })
      .catch((err) => {
        console.log("Error fetching wishlist:", err.response || err);
        if (err.response?.status === 401) {
          localStorage.clear();
          alert("Session expired. Please log in again.");
          navigate("/login");
        }
      });
  }, [token, navigate]);

  useEffect(() => {
    if (!token) {
      const guestItems = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");
      setCartIds(guestItems.map((item) => item.productId));
      setCartQuantities(
        guestItems.reduce((acc, item) => {
          acc[item.productId] = item.quantity;
          return acc;
        }, {})
      );
      return;
    }

    axios.get(apiUrl("/api/cart"), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => {
        setCartIds(res.data.map((item) => item.productId));
        setCartQuantities(
          res.data.reduce((acc, item) => {
            acc[item.productId] = item.quantity;
            return acc;
          }, {})
        );
      })
      .catch((err) => {
        console.log("Error fetching cart:", err.response || err);
        if (err.response?.status === 401) {
          localStorage.clear();
          alert("Session expired. Please log in again.");
          navigate("/login");
        }
      });
  }, [token, navigate]);

  const handleWishlistToggle = async (productId) => {
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setPendingProductIds((current) => [...current, productId]);
      const inWishlist = wishlistIds.includes(productId);
      const res = inWishlist
        ? await axios.delete(apiUrl(`/api/wishlist/${productId}`), {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
        : await axios.post(apiUrl(`/api/wishlist/${productId}`), null, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

      setWishlistIds(res.data.map((product) => product.id));
    } catch (err) {
      console.log("Error updating wishlist:", err.response || err);
      if (err.response?.status === 401) {
        localStorage.clear();
        alert("Session expired. Please log in again.");
        navigate("/login");
        return;
      }
      alert(err.response?.data?.message || err.response?.data || "Failed to update wishlist");
    } finally {
      setPendingProductIds((current) => current.filter((id) => id !== productId));
    }
  };

  const handleAddToCart = async (productId) => {
    const product = products.find((item) => item.id === productId);
    if (!product) {
      return;
    }

    const maxCartQuantity = getMaxCartQuantity(product);
    if (maxCartQuantity <= 0) {
      alert("This product is out of stock");
      return;
    }

    if (!token) {
      const guestItems = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");
      const existingItem = guestItems.find((item) => item.productId === productId);
      if ((existingItem?.quantity || 0) >= maxCartQuantity) {
        alert(`You can add up to ${maxCartQuantity} item(s) for this product.`);
        return;
      }

      const nextItems = existingItem
        ? guestItems.map((item) =>
            item.productId === productId
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        : [
            ...guestItems,
            {
              productId: product.id,
              name: product.name,
              description: product.description,
              imageUrl: getPrimaryImage(product.imageUrl),
              price: product.price,
              quantity: 1,
              stock: getResolvedStock(product),
              maxCartQuantity
            }
          ];

      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(nextItems));
      setCartIds(nextItems.map((item) => item.productId));
      setCartQuantities(
        nextItems.reduce((acc, item) => {
          acc[item.productId] = item.quantity;
          return acc;
        }, {})
      );
      return;
    }

    try {
      const res = await axios.post(apiUrl(`/api/cart/${productId}`), null, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setCartIds(res.data.map((item) => item.productId));
      setCartQuantities(
        res.data.reduce((acc, item) => {
          acc[item.productId] = item.quantity;
          return acc;
        }, {})
      );
    } catch (err) {
      console.log("Error updating cart:", err.response || err);
      if (err.response?.status === 401) {
        localStorage.clear();
        alert("Session expired. Please log in again.");
        navigate("/login");
        return;
      }
      alert(err.response?.data?.message || err.response?.data || "Failed to add to cart");
    }
  };

  const handleUpdateCartQuantity = async (productId, nextQuantity) => {
    const product = products.find((item) => item.id === productId);
    const maxCartQuantity = getMaxCartQuantity(product);

    if (!token) {
      if (nextQuantity > maxCartQuantity) {
        alert(`You can add up to ${maxCartQuantity} item(s) for this product.`);
        return;
      }

      const guestItems = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");
      const nextItems = nextQuantity <= 0
        ? guestItems.filter((item) => item.productId !== productId)
        : guestItems.map((item) =>
            item.productId === productId ? { ...item, quantity: nextQuantity } : item
          );

      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(nextItems));
      setCartIds(nextItems.map((item) => item.productId));
      setCartQuantities(
        nextItems.reduce((acc, item) => {
          acc[item.productId] = item.quantity;
          return acc;
        }, {})
      );
      return;
    }

    try {
      let res;
      if (nextQuantity <= 0) {
        res = await axios.delete(apiUrl(`/api/cart/${productId}`), {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      } else {
        res = await axios.put(apiUrl(`/api/cart/${productId}?quantity=${nextQuantity}`), null, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }

      setCartIds(res.data.map((item) => item.productId));
      setCartQuantities(
        res.data.reduce((acc, item) => {
          acc[item.productId] = item.quantity;
          return acc;
        }, {})
      );
    } catch (err) {
      console.log("Error updating cart quantity:", err.response || err);
      if (err.response?.status === 401) {
        localStorage.clear();
        alert("Session expired. Please log in again.");
        navigate("/login");
        return;
      }
      alert(err.response?.data?.message || err.response?.data || "Failed to update cart");
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (role !== "ADMIN") {
      return;
    }

    if (!window.confirm("Remove this product from the catalog?")) {
      return;
    }

    try {
      await axios.delete(apiUrl(`/api/products/${productId}`), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setProducts((current) => current.filter((product) => product.id !== productId));
      setWishlistIds((current) => current.filter((id) => id !== productId));
      setCartIds((current) => current.filter((id) => id !== productId));
      setCartQuantities((current) => {
        const next = { ...current };
        delete next[productId];
        return next;
      });
    } catch (err) {
      console.log("Error deleting product:", err.response || err);
      alert(err.response?.data?.message || err.response?.data || "Failed to remove product");
    }
  };

  const handleFilterChange = (e) => {
    setFilters((current) => ({
      ...current,
      [e.target.name]: e.target.value
    }));
  };

  const handleStylePhotoChange = (e) => {
    const file = e.target.files?.[0];
    setStylePhoto(file || null);
    setStyleError("");
    setStyleAnalysis(null);
  };

  const openCameraModal = () => {
    setStyleError("");
    setCameraError("");
    setShowCamera(true);
  };

  const closeCameraModal = () => {
    setShowCamera(false);
  };

  const handleCapturePhoto = () => {
    const video = cameraVideoRef.current;
    const canvas = cameraCanvasRef.current;

    if (!video || !canvas) {
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const capturedFile = dataUrlToFile(dataUrl, `style-capture-${Date.now()}.jpg`);

    setStylePhoto(capturedFile);
    setStyleAnalysis(null);
    setStyleError("");
    setShowCamera(false);
  };

  const handleAnalyzeStyle = async () => {
    if (!stylePhoto) {
      setStyleError("Upload a face photo first so we can analyze your tone.");
      return;
    }

    const formData = new FormData();
    formData.append("image", stylePhoto);

    try {
      setAnalyzingStyle(true);
      setStyleError("");
      const res = await axios.post(apiUrl("/api/color-analysis"), formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      setStyleAnalysis(res.data);
    } catch (err) {
      console.log("Error analyzing colors:", err.response || err);
      setStyleAnalysis(null);
      setStyleError(err.response?.data?.message || err.response?.data || "We couldn't analyze this image. Try a clearer front-facing photo.");
    } finally {
      setAnalyzingStyle(false);
    }
  };

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category).filter(Boolean))),
    [products]
  );

  const sizes = useMemo(
    () => Array.from(new Set([...defaultSizeOptions, ...products.flatMap((product) => splitValues(product.size))])),
    [products]
  );

  const colors = useMemo(
    () => Array.from(new Set([...defaultColorOptions, ...products.flatMap((product) => splitValues(product.color))])),
    [products]
  );

  const suggestionSource = Array.from(
    new Set(
      products
        .flatMap((product) => [product.name, product.category, product.color])
        .filter(Boolean)
    )
  );

  const searchSuggestions = searchTerm
    ? suggestionSource
        .filter((item) =>
          item
            .toLowerCase()
            .split(/\s+/)
            .some((word) => word.startsWith(searchTerm.toLowerCase())) ||
          item.toLowerCase().startsWith(searchTerm.toLowerCase())
        )
        .slice(0, 6)
    : [];

  const matchesActiveFilters = (product, includeQuickFilter = true) => {
    const price = Number(product.price || 0);
    const rating = Number(product.rating || 0);
    const sizeValues = splitValues(product.size).map((item) => item.toLowerCase());
    const category = (product.category || "").toLowerCase();
    const colorValues = splitValues(product.color).map((item) => item.toLowerCase());
    const gender = (product.gender || "").toLowerCase();
    const searchValue = searchTerm.toLowerCase();

    const matchesSearch =
      !searchValue ||
      (product.name || "").toLowerCase().includes(searchValue) ||
      (product.description || "").toLowerCase().includes(searchValue) ||
      category.includes(searchValue) ||
      colorValues.some((item) => item.includes(searchValue));

    const matchesGender = !filters.gender || gender === filters.gender.toLowerCase();
    const matchesPrice =
      !filters.priceRange ||
      (filters.priceRange === "UNDER_500" && price < 500) ||
      (filters.priceRange === "500_1000" && price >= 500 && price <= 1000) ||
      (filters.priceRange === "1000_2000" && price > 1000 && price <= 2000) ||
      (filters.priceRange === "ABOVE_2000" && price > 2000);
    const matchesSize = !filters.size || sizeValues.includes(filters.size.toLowerCase());
    const matchesCategory = !filters.category || category === filters.category.toLowerCase();
    const matchesColor = !filters.color || colorValues.includes(filters.color.toLowerCase());
    const matchesQuick =
      !includeQuickFilter ||
      !quickFilter ||
      (quickFilter === "TOP_RATED" && rating >= 4) ||
      (quickFilter === "HOT_TRENDS" && product.hotTrend);

    return matchesSearch && matchesGender && matchesPrice && matchesSize && matchesCategory && matchesColor && matchesQuick;
  };

  const filteredProducts = products.filter((product) => matchesActiveFilters(product, true));
  const heroProducts = products.filter((product) => product.hotTrend && matchesActiveFilters(product, false));
  const heroSlides = [];

  for (let index = 0; index < heroProducts.length; index += 3) {
    heroSlides.push(heroProducts.slice(index, index + 3));
  }

  useEffect(() => {
    setHeroIndex(0);
  }, [heroSlides.length]);

  useEffect(() => {
    if (heroSlides.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroSlides.length);
    }, 4500);

    return () => window.clearInterval(intervalId);
  }, [heroSlides.length]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (colorFilterRef.current && !colorFilterRef.current.contains(event.target)) {
        setShowColorOptions(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const trendingProducts = filteredProducts.slice(0, 8);

  return (
    <div className="storefront-shell">
      <header className="storefront-header">
        <div className="brand-lockup">
          <span className="brand-mark">VASTRA AI</span>
          <nav className="storefront-primary-nav">
            {topLinks.map((link) => (
              <button
                key={link}
                className={`nav-pill-button ${
                  activeTopTab === link ? "active" : ""
                }`}
                onClick={() => {
                  setActiveTopTab(link);

                  if (link === "AI") {
                    setFilters((current) => ({ ...current, gender: "" }));
                  } else if (link === "ALL") {
                    setFilters((current) => ({ ...current, gender: "" }));
                  } else if (link === "MEN") {
                    setFilters((current) => ({ ...current, gender: "MEN" }));
                  } else if (link === "WOMEN") {
                    setFilters((current) => ({ ...current, gender: "WOMEN" }));
                  }
                }}
              >
                {link}
              </button>
            ))}
          </nav>
        </div>

        <div className="storefront-actions">
          <div className="storefront-search">
            <span className="storefront-search-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <line x1="16.65" y1="16.65" x2="21" y2="21" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by products"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => {
                if (searchTerm) {
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => {
                window.setTimeout(() => setShowSuggestions(false), 120);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setShowSuggestions(false);
                }
              }}
            />

            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="search-suggestion-box">
                {searchSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    className="search-suggestion-item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSearchTerm(suggestion);
                      setShowSuggestions(false);
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="header-shortcuts">
            <IconButton to={token ? "/dashboard" : "/login"} label={token ? "Account" : "Login"}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="8" r="4" />
              </svg>
            </IconButton>
            <IconButton to="/wishlist" label="Wishlist" count={token ? wishlistIds.length : 0}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-6.7-4.35-9.2-8.2A5.46 5.46 0 0 1 3.6 5.8 5.4 5.4 0 0 1 12 7.8a5.4 5.4 0 0 1 8.4-2 5.46 5.46 0 0 1 .8 7c-2.5 3.85-9.2 8.2-9.2 8.2Z" />
              </svg>
            </IconButton>
            <IconButton to="/cart" label="Cart" count={cartIds.length}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="20" r="1.5" />
                <circle cx="18" cy="20" r="1.5" />
                <path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h9.9a1 1 0 0 0 1-.8L21 7H7" />
              </svg>
            </IconButton>
          </div>
        </div>
      </header>

      {activeTopTab !== "AI" && (
        <>
          <section className="storefront-category-strip">
            <div className="promo-link-row">
              {promoLinks.map((link) => (
                <button
                  key={link}
                  className="promo-link-button"
                  onClick={() => {
                    if (link === "Hot Trends") {
                      setQuickFilter("HOT_TRENDS");
                    } else if (link === "Top Rated") {
                      setQuickFilter("TOP_RATED");
                    }
                  }}
                >
                  {link}
                </button>
              ))}
              <button
                className="promo-link-button filter-strip-button"
                onClick={() => setShowFilters((current) => !current)}
              >
                {showFilters ? "Hide Filter" : "Filter"}
              </button>
            </div>
          </section>

          <section className="storefront-hero">
            {heroProducts.length === 0 ? (
              <div className="hero-empty-state">
                <p className="section-label">Trending Products</p>
                <h3>No trending products yet</h3>
                <span>Mark products as Hot Trend from the admin panel to show them here.</span>
              </div>
            ) : (
              <>
                <div className="hero-slider-heading">
                  <div>
                    <p className="section-label">Trending Products</p>
                    <h2>Hot Trend Picks</h2>
                  </div>
                  {heroSlides.length > 1 && (
                    <div className="hero-slider-controls">
                      <button
                        className="hero-slider-button"
                        onClick={() =>
                          setHeroIndex((current) => (current - 1 + heroSlides.length) % heroSlides.length)
                        }
                        aria-label="Previous trending product"
                      >
                        &#8249;
                      </button>
                      <button
                        className="hero-slider-button"
                        onClick={() => setHeroIndex((current) => (current + 1) % heroSlides.length)}
                        aria-label="Next trending product"
                      >
                        &#8250;
                      </button>
                    </div>
                  )}
                </div>

                <div className="hero-slider-window">
                  <div
                    className="hero-slider-track"
                    style={{ transform: `translateX(-${heroIndex * 100}%)` }}
                  >
                    {heroSlides.map((slide, slideIndex) => (
                      <div key={`hero-slide-${slideIndex}`} className="hero-slide">
                        {slide.map((product, cardIndex) => (
                          <article
                            key={product.id}
                            className={`hero-card hero-card-${cardIndex + 1}`}
                            onClick={() => navigate(`/products/${product.id}`)}
                          >
                            <img src={getPrimaryImage(product.imageUrl)} alt={product.name} />
                            <div className="hero-overlay" />
                            <div className="hero-copy">
                              <p>{product.category || "Trending Product"}</p>
                              <h3>{product.name}</h3>
                              <span>From Rs. {product.price}</span>
                            </div>
                          </article>
                        ))}
                        {slide.length < 3 &&
                          Array.from({ length: 3 - slide.length }).map((_, emptyIndex) => (
                            <div
                              key={`hero-slide-${slideIndex}-empty-${emptyIndex}`}
                              className={`hero-card hero-card-${slide.length + emptyIndex + 1} hero-card-placeholder`}
                              aria-hidden="true"
                            />
                          ))}
                      </div>
                    ))}
                  </div>
                </div>

                {heroSlides.length > 1 && (
                  <div className="hero-slider-dots" aria-label="Trending products slider">
                    {heroSlides.map((_, index) => (
                      <button
                        key={`hero-dot-${index}`}
                        className={`hero-slider-dot ${index === heroIndex ? "active" : ""}`}
                        onClick={() => setHeroIndex(index)}
                        aria-label={`Go to trending slide ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}

      {activeTopTab === "AI" && (
        <section className="style-assistant-section">
          <div className="style-assistant-card style-assistant-intro">
            <div>
              <p className="section-label">AI Style Assistant</p>
              <h2>Find colors that flatter your skin tone</h2>
              <p className="style-assistant-copy">
                Upload a clear selfie and we&apos;ll estimate your tone profile, suggest colors that should suit you, and pull matching products from your store.
              </p>
            </div>

            <div className="style-assistant-upload">
              <label className="style-upload-dropzone">
                <input type="file" accept="image/*" onChange={handleStylePhotoChange} />
                {stylePreview ? (
                  <img src={stylePreview} alt="Style analysis preview" className="style-upload-preview" />
                ) : (
                  <div className="style-upload-placeholder">
                    <strong>Upload or click your photo</strong>
                    <span>Natural light and a front-facing image work best.</span>
                  </div>
                )}
              </label>

              <div className="style-upload-actions">
                <div className="style-upload-button-row">
                  <button type="button" className="checkout-secondary-button" onClick={openCameraModal}>
                    Click Photo
                  </button>
                  <label className="style-upload-inline-picker">
                    <input type="file" accept="image/*" onChange={handleStylePhotoChange} />
                    Upload Photo
                  </label>
                </div>
                <button className="checkout-primary-button" onClick={handleAnalyzeStyle} disabled={analyzingStyle}>
                  {analyzingStyle ? "Analyzing..." : "Analyze My Colors"}
                </button>
                <span className="style-upload-note">Best for face photos with even lighting and minimal heavy filters.</span>
              </div>

              {styleError && <p className="style-analysis-error">{styleError}</p>}
            </div>
          </div>

          {styleAnalysis && (
            <div className="style-assistant-results">
              <article className="style-assistant-card style-profile-card">
                <div className="style-profile-header">
                  <div>
                    <p className="section-label">Detected Profile</p>
                    <h3>{styleAnalysis.profile?.season || "Personalized Palette"}</h3>
                  </div>
                  <div className="style-profile-tags">
                    <span>{styleAnalysis.profile?.depth}</span>
                    <span>{styleAnalysis.profile?.undertone}</span>
                  </div>
                </div>

                <p className="style-profile-summary">{styleAnalysis.profile?.summary}</p>

                <div className="style-palette-block">
                  <div>
                    <h4>Best Colors For You</h4>
                    <div className="style-chip-grid">
                      {(styleAnalysis.recommendedColors || []).map((color) => (
                        <div key={color.name} className="style-color-chip">
                          <span className="style-color-dot" style={{ backgroundColor: color.hex }} aria-hidden="true" />
                          <div>
                            <strong>{color.name}</strong>
                            <small>{color.reason}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4>Use Less Often</h4>
                    <div className="style-chip-grid muted">
                      {(styleAnalysis.colorsToAvoid || []).map((color) => (
                        <div key={color.name} className="style-color-chip">
                          <span className="style-color-dot" style={{ backgroundColor: color.hex }} aria-hidden="true" />
                          <div>
                            <strong>{color.name}</strong>
                            <small>{color.reason}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="style-analysis-note">{styleAnalysis.analysisNote}</p>
              </article>

              <article className="style-assistant-card style-products-card">
                <div className="style-products-header">
                  <div>
                    <p className="section-label">Shop The Palette</p>
                    <h3>Recommended products from your catalog</h3>
                  </div>
                </div>

                <div className="style-recommendation-grid">
                  {(styleAnalysis.productRecommendations || []).length === 0 ? (
                    <div className="checkout-empty">
                      <h3>No matching products yet</h3>
                      <p>Add more product color tags like blue, pink, olive, black, or green to improve matching.</p>
                    </div>
                  ) : (
                    styleAnalysis.productRecommendations.map(({ product, matchReason, matchScore }) => (
                      <article
                        key={product.id}
                        className="style-recommendation-card"
                        onClick={() => navigate(`/products/${product.id}`)}
                      >
                        <img src={getPrimaryImage(product.imageUrl)} alt={product.name} />
                        <div className="style-recommendation-copy">
                          <div className="style-recommendation-meta">
                            <span>{(product.category || "Style").replaceAll("_", " ")}</span>
                            <strong>Style score {matchScore}</strong>
                          </div>
                          <h4>{product.name}</h4>
                          <p>{matchReason}</p>
                          <div className="style-recommendation-footer">
                            <strong>Rs. {product.price}</strong>
                            <button
                              className="product-action-button primary compact"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/products/${product.id}`);
                              }}
                            >
                              View Product
                            </button>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </article>
            </div>
          )}
        </section>
      )}

      {showCamera && (
        <div className="camera-modal-backdrop" onClick={closeCameraModal}>
          <div className="camera-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="camera-modal-header">
              <div>
                <p className="section-label">Camera Capture</p>
                <h3>Fit your face inside the guide</h3>
              </div>
              <button type="button" className="camera-close-button" onClick={closeCameraModal}>
                Close
              </button>
            </div>

            <div className="camera-preview-shell">
              {cameraError ? (
                <div className="camera-empty-state">
                  <strong>Camera unavailable</strong>
                  <span>{cameraError}</span>
                </div>
              ) : (
                <>
                  <video
                    ref={cameraVideoRef}
                    className="camera-preview-video"
                    autoPlay
                    muted
                    playsInline
                    onLoadedMetadata={() => setCameraReady(true)}
                  />
                  <div className="camera-guide-overlay" aria-hidden="true">
                    <div className={`camera-face-guide ${faceAligned ? "aligned" : ""}`} />
                  </div>
                </>
              )}
            </div>

            <div className="camera-status-row">
              <p className={`camera-status-copy ${faceAligned ? "aligned" : ""}`}>
                {cameraError || cameraHint}
              </p>
              {!supportsFaceDetector && !cameraError && (
                <span className="camera-support-note">Auto face fit is not supported in this browser, so align manually.</span>
              )}
            </div>

            <div className="camera-action-row">
              <button type="button" className="checkout-secondary-button" onClick={closeCameraModal}>
                Cancel
              </button>
              <button
                type="button"
                className="checkout-primary-button"
                onClick={handleCapturePhoto}
                disabled={!cameraReady || !faceAligned || Boolean(cameraError)}
              >
                Capture Photo
              </button>
            </div>

            <canvas ref={cameraCanvasRef} className="camera-hidden-canvas" />
          </div>
        </div>
      )}

      {activeTopTab !== "AI" && (
      <section className={`storefront-content ${showFilters ? "filters-open" : ""}`}>
        <aside className={`storefront-filter-panel ${showFilters ? "open" : ""}`}>
          <div className="filter-panel-header">
            <div>
              <p className="section-label">Refine</p>
              <h3>Filters</h3>
            </div>
            <button
              className="checkout-secondary-button"
              onClick={() => {
                setFilters({
                  gender: "",
                  priceRange: "",
                  size: "",
                  category: "",
                  color: ""
                });
                setQuickFilter("");
                setSearchTerm("");
              }}
            >
              Clear
            </button>
          </div>

          <label className="filter-label">
            <span>Price Range</span>
            <select name="priceRange" value={filters.priceRange} onChange={handleFilterChange}>
              <option value="">All Price Ranges</option>
              <option value="UNDER_500">Under 500</option>
              <option value="500_1000">500 to 1000</option>
              <option value="1000_2000">1000 to 2000</option>
              <option value="ABOVE_2000">Above 2000</option>
            </select>
          </label>

          <label className="filter-label">
            <span>Size</span>
            <select name="size" value={filters.size} onChange={handleFilterChange}>
              <option value="">All Sizes</option>
              {sizes.map((sizeOption) => (
                <option key={sizeOption} value={sizeOption}>{sizeOption}</option>
              ))}
            </select>
          </label>

          <label className="filter-label">
            <span>Category</span>
            <select name="category" value={filters.category} onChange={handleFilterChange}>
              <option value="">All Categories</option>
              {categories.map((categoryOption) => (
                <option key={categoryOption} value={categoryOption}>{categoryOption.replaceAll("_", " ")}</option>
              ))}
            </select>
          </label>

          <label className="filter-label">
            <span>Color</span>
            <div className="color-filter-dropdown" ref={colorFilterRef}>
              <button
                type="button"
                className="color-filter-trigger"
                onClick={() => setShowColorOptions((current) => !current)}
                aria-expanded={showColorOptions}
              >
                <span className="color-filter-trigger-copy">
                  {filters.color ? (
                    <>
                      <span
                        className="color-swatch-box"
                        style={{ backgroundColor: filters.color.toLowerCase() }}
                        aria-hidden="true"
                      />
                      <span>{filters.color}</span>
                    </>
                  ) : (
                    <span>All Colors</span>
                  )}
                </span>
                <span className="color-filter-caret" aria-hidden="true">
                  {showColorOptions ? "˄" : "˅"}
                </span>
              </button>

              {showColorOptions && (
                <div className="color-filter-menu">
                  <button
                    type="button"
                    className={`color-filter-option ${!filters.color ? "active" : ""}`}
                    onClick={() => {
                      setFilters((current) => ({ ...current, color: "" }));
                      setShowColorOptions(false);
                    }}
                  >
                    <span>All Colors</span>
                  </button>
                  {colors.map((colorOption) => (
                    <button
                      key={colorOption}
                      type="button"
                      className={`color-filter-option ${filters.color === colorOption ? "active" : ""}`}
                      onClick={() => {
                        setFilters((current) => ({ ...current, color: colorOption }));
                        setShowColorOptions(false);
                      }}
                    >
                      <span
                        className="color-swatch-box"
                        style={{ backgroundColor: colorOption.toLowerCase() }}
                        aria-hidden="true"
                      />
                      <span>{colorOption}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </label>

          <div className="quick-filter-group">
            <p className="section-label">Quick Filter</p>
            <div className="quick-chip-row">
              <button
                className={`quick-chip ${quickFilter === "TOP_RATED" ? "active" : ""}`}
                onClick={() => setQuickFilter(quickFilter === "TOP_RATED" ? "" : "TOP_RATED")}
              >
                Top Rated
              </button>
              <button
                className={`quick-chip ${quickFilter === "HOT_TRENDS" ? "active" : ""}`}
                onClick={() => setQuickFilter(quickFilter === "HOT_TRENDS" ? "" : "HOT_TRENDS")}
              >
                Hot Trends
              </button>
            </div>
          </div>
        </aside>

        <div className="storefront-results">
          <div className="results-toolbar">
            <div>
              <p className="section-label">Newest Drops Of The Season</p>
              <h2>{filteredProducts.length} Products Found</h2>
            </div>
            <button
              className="checkout-secondary-button mobile-filter-toggle"
              onClick={() => setShowFilters((current) => !current)}
            >
              {showFilters ? "Hide Filters" : "Show Filters"}
            </button>
          </div>

          <div className="product-grid">
            {trendingProducts.length === 0 ? (
              <div className="checkout-empty">
                <h3>No products match this search</h3>
                <p>Try another keyword, category, or clear the filters.</p>
              </div>
            ) : (
              trendingProducts.map((product) => (
                <article
                  key={product.id}
                  className="product-card product-card-clickable"
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  <div className="product-card-image-wrap">
                    <img src={getPrimaryImage(product.imageUrl)} alt={product.name} className="product-card-image" />
                    <div className="product-card-badges">
                      {product.hotTrend && <span className="product-badge hot">Hot Trend</span>}
                      {(product.rating || 0) >= 4 && <span className="product-badge rated">Top Rated</span>}
                    </div>
                  </div>

                  <div className="product-card-body">
                    <div className="product-card-copy">
                      <p className="product-category">{(product.category || "Style").replaceAll("_", " ")}</p>
                      <h3>{product.name}</h3>
                      <p className="product-description">{product.description}</p>
                    </div>

                    <div className="product-meta-row">
                      <strong>Rs. {product.price}</strong>
                      <span>{splitValues(product.size).join(", ") || "Free Size"}</span>
                    </div>

                    <div className="product-meta-row subtle">
                      <span>{splitValues(product.color).join(", ") || "Classic"}</span>
                      {getMaxCartQuantity(product) > 0 && getMaxCartQuantity(product) <= 3 ? (
                        <span className="product-stock-warning">{getMaxCartQuantity(product)} left</span>
                      ) : null}
                    </div>

                    <div className="product-card-actions">
                      <button
                        className={`wishlist-icon-button ${wishlistIds.includes(product.id) ? "active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWishlistToggle(product.id);
                        }}
                        disabled={pendingProductIds.includes(product.id)}
                        aria-label={wishlistIds.includes(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                      >
                        <svg viewBox="0 0 24 24" fill={wishlistIds.includes(product.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 21s-6.7-4.35-9.2-8.2A5.46 5.46 0 0 1 3.6 5.8 5.4 5.4 0 0 1 12 7.8a5.4 5.4 0 0 1 8.4-2 5.46 5.46 0 0 1 .8 7c-2.5 3.85-9.2 8.2-9.2 8.2Z" />
                        </svg>
                      </button>
                      {role === "ADMIN" && token ? (
                        <button
                          className="product-action-button admin-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProduct(product.id);
                          }}
                        >
                          Remove
                        </button>
                      ) : cartIds.includes(product.id) ? (
                        <div
                          className="product-quantity-control"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button onClick={() => handleUpdateCartQuantity(product.id, (cartQuantities[product.id] || 1) - 1)}>-</button>
                          <span>{cartQuantities[product.id] || 1}</span>
                          <button
                            onClick={() => handleUpdateCartQuantity(product.id, (cartQuantities[product.id] || 0) + 1)}
                            disabled={(cartQuantities[product.id] || 0) >= getMaxCartQuantity(product)}
                          >
                            +
                          </button>
                        </div>
                      ) : getMaxCartQuantity(product) <= 0 ? (
                        <button className="product-action-button secondary compact" disabled>
                          Out of Stock
                        </button>
                      ) : (
                        <button
                          className="product-action-button primary compact"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(product.id);
                          }}
                        >
                          Add Cart
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
      )}
    </div>
  );
}

export default Products;
