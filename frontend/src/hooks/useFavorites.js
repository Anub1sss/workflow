import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "tg_favorite_channels";

const FavoritesContext = createContext({
  favorites: [],
  isFavorite: () => false,
  toggle: () => {},
  add: () => {},
  remove: () => {},
});

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const isFavorite = useCallback(
    (username) => favorites.some((f) => f.username === username),
    [favorites]
  );

  const add = useCallback((channel) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.username === channel.username)) return prev;
      return [
        ...prev,
        {
          username: channel.username,
          title: channel.title || channel.username,
          image100: channel.image100 || "",
        },
      ];
    });
  }, []);

  const remove = useCallback((username) => {
    setFavorites((prev) => prev.filter((f) => f.username !== username));
  }, []);

  const toggle = useCallback(
    (channel) => {
      if (isFavorite(channel.username)) {
        remove(channel.username);
      } else {
        add(channel);
      }
    },
    [isFavorite, add, remove]
  );

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggle, add, remove }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
