import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cart")) || [];
    } catch {
      return [];
    }
  });

  // sync to localStorage whenever cart changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const addItem = (product, qty, size) => {
    setCart((prev) => {
      const key = `${product._id}-${size?.label ?? "default"}`;
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key ? { ...i, qty: i.qty + qty } : i,
        );
      }
      return [
        ...prev,
        {
          key,
          type: "product",
          product,
          qty,
          size: size ?? null,
          unitPrice: size?.price ?? product.sizes?.[0]?.price,
        },
      ];
    });
  };

  const addBundle = (bundle, items, total, discount) => {
    setCart((prev) => [
      ...prev,
      {
        key: `bundle-${bundle._id}-${Date.now()}`,
        type: "bundle",
        bundle,
        items, // [{ product, qty }]
        total,
        discount,
      },
    ]);
  };

  const removeItem = (key) =>
    setCart((prev) => prev.filter((i) => i.key !== key));

  const updateQty = (key, qty) => {
    if (qty <= 0) return removeItem(key);
    setCart((prev) => prev.map((i) => (i.key === key ? { ...i, qty } : i)));
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((s, i) => s + (i.qty ?? 1), 0);
  const totalPrice = cart.reduce((s, i) => {
    if (i.type === "bundle") return s + i.total;
    return s + i.unitPrice * i.qty;
  }, 0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const toggleCart = () => setIsCartOpen((prev) => !prev);

  return (
    <CartContext.Provider
      value={{
        cart,
        addItem,
        addBundle,
        removeItem,
        updateQty,
        clearCart,
        totalItems,
        totalPrice,
        isCartOpen,
        openCart,
        closeCart,
        toggleCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
