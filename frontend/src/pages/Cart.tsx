import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Header from "../component/Header";
import Footer from "../component/Footer";
import Banner from "../component/Banner";
import Button from "../component/Button";
import { products } from "../data/databank";
import { useCart } from "../context/CartContext";
import { getAllGlobalDesigns } from '../utils/firebaseStorage';
import { getDesignPrice } from '../onchain/adapter';

const Cart = () => {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeItem } = useCart();
  const [customDesigns, setCustomDesigns] = useState<any[]>([]);
  const [onchainPrices, setOnchainPrices] = useState<Record<number, number>>({});

 
  useEffect(() => {
    const loadDesigns = async () => {
      try {
     
        const firebaseDesigns = await getAllGlobalDesigns();
        console.log('Cart - Firebase designs loaded:', firebaseDesigns.length);
        
       
        const userDesigns = JSON.parse(localStorage.getItem('userDesigns') || '[]');
        const ngoDesigns = JSON.parse(localStorage.getItem('ngoDesigns') || '[]');
        
       
        const allDesigns = [...firebaseDesigns, ...userDesigns, ...ngoDesigns];
        const uniqueDesigns = Array.from(
          new Map(allDesigns.map(design => [design.id, design])).values()
        );
        
        setCustomDesigns(uniqueDesigns);
        console.log('Cart - Total unique designs loaded:', uniqueDesigns.length);
      } catch (error) {
        console.error('Error loading designs for cart:', error);
    
        const userDesigns = JSON.parse(localStorage.getItem('userDesigns') || '[]');
        const ngoDesigns = JSON.parse(localStorage.getItem('ngoDesigns') || '[]');
        setCustomDesigns([...userDesigns, ...ngoDesigns]);
      }
    };
    
    loadDesigns();
  }, []);

  useEffect(() => {
    const loadOnchainPrices = async () => {
      const ids = Array.from(new Set(cartItems.map(ci => ci.id)));
      const next: Record<number, number> = {};
      for (const id of ids) {
        try {
          const p = await getDesignPrice(BigInt(id));
          const hbar = Number(p) / 1e18;
          if (hbar > 0) next[id] = hbar;
        } catch {}
      }
      setOnchainPrices(next);
    };
    if (cartItems.length) loadOnchainPrices();
  }, [cartItems]);

  const getProductById = (id: number) => {

    const regularProduct = products.find((product) => product.id === id);
    if (regularProduct) return regularProduct;
    
  
    const customDesign = customDesigns.find((design) => design.id === id);
    return customDesign;
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const product = getProductById(item.id);
      if (product) {
        const overrideHBAR = onchainPrices[item.id];
        if (overrideHBAR && !isNaN(overrideHBAR)) {
          return total + overrideHBAR * item.quantity;
        }
        let price;
        if (product.pieceName) {
          price = parseInt(product.price.toString().replace(/[^\d]/g, ""));
        } else if (product.price) {
          price = parseInt(product.price.replace(/[^\d]/g, ""));
        } else {
          price = 0;
        }
        return total + price * item.quantity;
      }
      return total;
    }, 0);
  };

  const shippingCost = 0;
  const subtotal = calculateSubtotal();

  const formatPrice = (amount: number) => {
    return Object.keys(onchainPrices).length ? `${amount.toLocaleString()} HBAR` : `₦${amount.toLocaleString()}`;
  };

    return (
        <div>
            <Header />

         
      <section className="px-4 md:px-7 py-12">
        <div className="max-w-6xl mx-auto">
          {cartItems.length === 0 ? (
           
            <div className="text-center py-20">
              <h1 className="text-3xl font-bold text-black mb-8">
                Shopping bag
              </h1>
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                Your cart is empty
              </h3>
              <p className="text-gray-500 mb-6">
                Looks like you haven't added any items to your cart yet.
              </p>
              <Button
                onClick={() => navigate("/shop")}
                variant="primary-bw"
                size="lg"
              >
                Continue Shopping
              </Button>
            </div>
          ) : (
          
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
              <div className="lg:col-span-2">
                <h1 className="text-3xl font-bold text-black mb-8">
                  Shopping bag
                </h1>

                <div className="space-y-6">
                  {cartItems.map((item, index) => {
                    const product = getProductById(item.id);
                    if (!product) return null;

                    return (
                      <div
                        key={`${item.id}-${index}`}
                        className="border-b border-gray-200 pb-6"
                      >
                        <div className="flex gap-4">
                        
                          <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                            {product.pieceName ? (
                            
                              <>
                                <img 
                                  src="/shirtfront.png" 
                                  alt="Shirt Mockup" 
                                  className="w-full h-full object-cover"
                                  style={{ 
                                    filter: product.color === '#FFFFFF' ? 'none' : 
                                           product.color === '#000000' ? 'brightness(0)' : 'none'
                                  }}
                                />
                                {(product.frontDesign?.dataUrl || product.frontDesign?.url) && (
                                  <div 
                                    className="absolute"
                                    style={{ 
                                      width: '65%', 
                                      height: 'auto',
                                      maxWidth: '36px',
                                      maxHeight: '50px',
                                      top: '50%',
                                      left: '50%',
                                      transform: 'translate(-50%, -50%)'
                                    }}
                                  >
                                    <img 
                                      src={product.frontDesign?.url || product.frontDesign?.dataUrl} 
                                      alt="Design" 
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                )}
                              </>
                            ) : (
                           
                              <img
                                src={product.image}
                                alt={product.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>

                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-black mb-1">
                              {product.pieceName || product.title}
                            </h3>
                            <p className="text-sm text-black mb-3">
                              {product.pieceName ? `Campaign: ${product.campaign}` : `By ${product.creator}`}
                            </p>
                            <p className="text-sm text-black mb-3">
                              {item.color} {item.size}
                            </p>

                            <div className="mb-3">
                              <label className="text-sm text-black mb-2 block">
                                Quantity
                              </label>
                              <div className="flex items-center gap-2">
                                 <button
                                   onClick={() =>
                                     updateQuantity(item.uniqueId, item.quantity - 1)
                                   }
                                   className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                                 >
                                   <span className="text-base">-</span>
                                 </button>
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateQuantity(
                                      item.uniqueId,
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-12 h-8 border border-gray-300 rounded text-center text-sm"
                                  min="0"
                                />
                                 <button
                                   onClick={() =>
                                     updateQuantity(item.uniqueId, item.quantity + 1)
                                   }
                                   className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white hover:bg-gray-800 transition-colors"
                                 >
                                   <span className="text-base">+</span>
                                 </button>
                              </div>
                            </div>

                            <button
                              onClick={() => removeItem(item.uniqueId)}
                              className="text-sm text-black hover:text-gray-600 transition-colors"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="text-right">
                            <p className="text-lg font-medium text-black">
                              {formatPrice(
                                product.pieceName ? 
                                  parseInt(product.price.toString().replace(/[^\d]/g, "")) * item.quantity :
                                  parseInt(product.price.replace(/[^\d]/g, "")) * item.quantity
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            
              <div className="lg:col-span-1">
                <h2 className="text-3xl font-bold text-black mb-8">Summary</h2>

                <div className="bg-gray-100 rounded-lg p-6">
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between">
                      <span className="text-black">Subtotal</span>
                      <span className="text-black font-medium">
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black">Shipping</span>
                      <span className="text-black font-medium">
                        {formatPrice(shippingCost)}
                      </span>
                    </div>
                    <div className="border-t border-gray-300 pt-4">
                      <div className="flex justify-between">
                        <span className="text-black font-semibold text-lg">
                          Total
                        </span>
                        <span className="text-black font-semibold text-lg">
                          {formatPrice(subtotal + shippingCost)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="primary-bw"
                    size="lg"
                    className="w-full"
                    onClick={() => navigate("/checkout")}
                  >
                    Continue to Checkout
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

            <Banner />
            <Footer />
        </div>
  );
};

export default Cart;
