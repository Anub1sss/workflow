import React, { useState, useEffect } from "react";
import {
  X, Newspaper, Zap, TrendingUp, Star, Filter,
  Search, Eye, Megaphone, Activity, ChevronRight, ChevronLeft,
  Hash, Users, Globe,
} from "lucide-react";
import { fetchChannelsList, fetchCategories } from "../api";

const PRESETS = [
  {
    icon: <Star size={20} />,
    title: "Мои каналы — лента",
    desc: "Посты из избранных каналов",
    type: "my_feed",
    iconColor: "var(--tg-orange)",
    filters: { sort: "date", order: "desc" },
  },
  {
    icon: <Newspaper size={20} />,
    title: "Все посты",
    desc: "Лента всех постов по дате",
    type: "posts",
    iconColor: "var(--tg-accent)",
    filters: { sort: "date", order: "desc" },
  },
  {
    icon: <Zap size={20} />,
    title: "Вирусные",
    desc: "Посты с аномальным охватом",
    type: "viral",
    iconColor: "var(--tg-red)",
    filters: { sort: "views_dev", order: "desc" },
  },
  {
    icon: <Megaphone size={20} />,
    title: "Рекламные посты",
    desc: "Рекламные креативы и Telegram Ads",
    type: "ad_posts",
    iconColor: "var(--tg-orange)",
    filters: { sort: "date", order: "desc", only_ad: "1" },
  },
  {
    icon: <Search size={20} />,
    title: "Поиск по постам",
    desc: "Поиск слов, фраз и упоминаний",
    type: "post_search",
    iconColor: "var(--tg-accent)",
    filters: { sort: "date", order: "desc" },
    needsSearch: true,
  },
  {
    icon: <Activity size={20} />,
    title: "Отслеживание событий",
    desc: "Мониторинг слов, каналов и событий",
    type: "tracking",
    iconColor: "var(--tg-green)",
    filters: { sort: "date", order: "desc" },
    needsTracking: true,
  },
  {
    icon: <Eye size={20} />,
    title: "Мои каналы — карточки",
    desc: "Каталог избранных каналов",
    type: "my_channels",
    iconColor: "var(--tg-orange)",
    filters: { sort: "subscribers", order: "desc" },
  },
  {
    icon: <TrendingUp size={20} />,
    title: "Топ каналы (ER)",
    desc: "Каналы с макс. вовлечённостью",
    type: "feed",
    iconColor: "var(--tg-green)",
    filters: { sort: "er_pct", order: "desc" },
  },
  {
    icon: <Filter size={20} />,
    title: "Своя колонка",
    desc: "Настрой любые фильтры вручную",
    type: "custom",
    iconColor: "var(--tg-text-muted)",
    filters: {},
  },
];

export default function AddColumnPanel({ onAdd, onCancel }) {
  const [step, setStep] = useState("presets");
  const [, setSelectedPreset] = useState(null);
  const [customType, setCustomType] = useState("posts");
  const [customTitle, setCustomTitle] = useState("");
  const [channels, setChannels] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [chSearch, setChSearch] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");

  // Search wizard state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState("all");
  const [searchScopeChannels, setSearchScopeChannels] = useState([]);
  const [searchCategory, setSearchCategory] = useState("");
  const [searchDateFrom, setSearchDateFrom] = useState("");
  const [searchDateTo, setSearchDateTo] = useState("");
  const [searchSort, setSearchSort] = useState("date");
  const [searchOrder, setSearchOrder] = useState("desc");
  const [searchOnlyPhoto, setSearchOnlyPhoto] = useState(false);
  const [searchOnlyAd, setSearchOnlyAd] = useState(false);
  const [searchMinViews, setSearchMinViews] = useState("");
  const [searchMinReactions, setSearchMinReactions] = useState("");

  // Tracking wizard state
  const [trackStep, setTrackStep] = useState(1);
  const [trackType, setTrackType] = useState("");
  const [trackKeywords, setTrackKeywords] = useState("");
  const [trackScope, setTrackScope] = useState("all");
  const [trackScopeChannels, setTrackScopeChannels] = useState([]);
  const [trackCountry, setTrackCountry] = useState("");
  const [trackLanguage, setTrackLanguage] = useState("");
  const [trackCategory, setTrackCategory] = useState("");
  const [trackMinSubs, setTrackMinSubs] = useState("");

  useEffect(() => {
    fetchChannelsList().then(setChannels).catch(() => {});
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const handlePreset = (preset) => {
    if (preset.type === "custom") {
      setStep("custom");
      return;
    }
    if (preset.needsSearch) {
      setSelectedPreset(preset);
      setStep("search");
      setSearchQuery("");
      setSearchScope("all");
      setSearchScopeChannels([]);
      setSearchCategory("");
      setSearchDateFrom("");
      setSearchDateTo("");
      setSearchSort("date");
      setSearchOrder("desc");
      setSearchOnlyPhoto(false);
      setSearchOnlyAd(false);
      setSearchMinViews("");
      setSearchMinReactions("");
      setChSearch("");
      return;
    }
    if (preset.needsTracking) {
      setSelectedPreset(preset);
      setStep("tracking");
      setTrackStep(1);
      setTrackType("");
      setTrackKeywords("");
      setTrackScope("all");
      setTrackScopeChannels([]);
      setTrackCountry("");
      setTrackLanguage("");
      setTrackCategory("");
      setTrackMinSubs("");
      return;
    }
    onAdd({
      title: preset.title,
      type: preset.type,
      filters: preset.filters,
    });
  };

  const handleSearchAdd = () => {
    if (!searchQuery.trim()) return;
    const filters = { sort: searchSort, order: searchOrder };
    if (searchScope === "include" && searchScopeChannels.length > 0) {
      filters.channels = searchScopeChannels.join(",");
    }
    if (searchCategory) filters.category = searchCategory;
    if (searchDateFrom) filters.date_from = searchDateFrom;
    if (searchDateTo) filters.date_to = searchDateTo;
    if (searchOnlyPhoto) filters.only_photo = "1";
    if (searchOnlyAd) filters.only_ad = "1";
    if (searchMinViews) filters.min_p_views = searchMinViews;
    if (searchMinReactions) filters.min_p_reactions = searchMinReactions;

    onAdd({
      title: `Поиск: ${searchQuery.trim()}`,
      type: "post_search",
      filters,
      keywords: searchQuery.trim(),
    });
  };

  const handleTrackingAdd = () => {
    const filters = { sort: "date", order: "desc" };
    let title = "Трекинг";

    if (trackType === "words") {
      if (!trackKeywords.trim()) return;
      title = `🔍 ${trackKeywords.trim()}`;
    } else if (trackType === "channels") {
      if (trackScopeChannels.length === 0) return;
      title = `📡 Трекинг (${trackScopeChannels.length} кан.)`;
    }

    if (trackScope === "include" && trackScopeChannels.length > 0) {
      filters.channels = trackScopeChannels.join(",");
    }
    if (trackCountry) filters.country = trackCountry;
    if (trackLanguage) filters.language = trackLanguage;
    if (trackCategory) filters.category = trackCategory;
    if (trackMinSubs) filters.min_subs = trackMinSubs;

    onAdd({
      title,
      type: "tracking",
      filters,
      keywords: trackType === "words" ? trackKeywords.trim() : undefined,
      competitorChannels: trackType === "channels" ? trackScopeChannels.join(",") : undefined,
      trackingConfig: {
        trackType,
        trackScope,
        trackCountry,
        trackLanguage,
        trackCategory,
        trackMinSubs,
      },
    });
  };

  const handleCustomAdd = () => {
    const filters = {};
    if (selectedChannels.length > 0) filters.channels = selectedChannels.join(",");
    if (selectedCategory) filters.category = selectedCategory;
    onAdd({
      title: customTitle || (customType === "posts" ? "Посты" : "Каналы"),
      type: customType,
      filters,
    });
  };

  const filtered = chSearch
    ? channels.filter(ch =>
        ch.username.toLowerCase().includes(chSearch.toLowerCase()) ||
        (ch.title && ch.title.toLowerCase().includes(chSearch.toLowerCase()))
      )
    : channels;

  const trackFiltered = chSearch
    ? channels.filter(ch =>
        ch.username.toLowerCase().includes(chSearch.toLowerCase()) ||
        (ch.title && ch.title.toLowerCase().includes(chSearch.toLowerCase()))
      )
    : channels;

  const canTrackNext = () => {
    if (trackStep === 1) return !!trackType;
    if (trackStep === 2) {
      if (trackType === "words") return !!trackKeywords.trim();
      if (trackType === "channels") return trackScopeChannels.length > 0;
    }
    return true;
  };

  return (
    <div style={st.column}>
      <div style={st.header}>
        <span style={st.headerTitle}>
          {step === "presets" && "Добавить колонку"}
          {step === "search" && "Поиск по постам"}
          {step === "tracking" && "Отслеживание событий"}
          {step === "custom" && "Своя колонка"}
        </span>
        <button style={st.closeBtn} onClick={onCancel}><X size={16} /></button>
      </div>

      {/* ===== PRESETS ===== */}
      {step === "presets" && (
        <div style={st.presetsList}>
          {PRESETS.map((p, i) => (
            <button key={i} style={st.presetBtn} onClick={() => handlePreset(p)}>
              <div style={{ ...st.presetIcon, background: (p.iconColor || "var(--tg-accent)") + "18", color: p.iconColor }}>
                {p.icon}
              </div>
              <div style={st.presetInfo}>
                <span style={st.presetTitle}>{p.title}</span>
                <span style={st.presetDesc}>{p.desc}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ===== SEARCH WIZARD ===== */}
      {step === "search" && (
        <div style={st.form}>
          {/* Query */}
          <div style={st.field}>
            <label style={st.label}>Поисковый запрос</label>
            <input style={st.input} value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Слово, фраза или @упоминание" autoFocus />
            <span style={st.hint}>Поиск по тексту постов во всех каналах</span>
          </div>

          <div style={st.divider} />

          {/* Scope */}
          <div style={st.sectionTitle}>Искать в:</div>
          <div style={st.scopeOptions}>
            <button style={{ ...st.scopeBtn, ...(searchScope === "all" ? st.scopeBtnActive : {}) }}
              onClick={() => setSearchScope("all")}>
              <Globe size={14} />
              <span>Во всех каналах</span>
            </button>
            <button style={{ ...st.scopeBtn, ...(searchScope === "include" ? st.scopeBtnActive : {}) }}
              onClick={() => setSearchScope("include")}>
              <Search size={14} />
              <span>Только в определённых каналах</span>
            </button>
          </div>

          {searchScope === "include" && (
            <div style={st.field}>
              <label style={st.label}>
                Каналы {searchScopeChannels.length > 0 && `(${searchScopeChannels.length})`}
              </label>
              <input style={st.input} placeholder="Поиск каналов..."
                value={chSearch} onChange={e => setChSearch(e.target.value)} />
              {searchScopeChannels.length > 0 && (
                <div style={st.chipRow}>
                  {searchScopeChannels.map(u => (
                    <span key={u} style={st.chip}>
                      @{u}
                      <button style={st.chipX} onClick={() => setSearchScopeChannels(p => p.filter(x => x !== u))}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div style={st.chList}>
                {filtered.slice(0, 40).map(ch => {
                  const active = searchScopeChannels.includes(ch.username);
                  return (
                    <button key={ch.username}
                      style={{ ...st.chItem, ...(active ? st.chItemActive : {}) }}
                      onClick={() => setSearchScopeChannels(prev =>
                        active ? prev.filter(u => u !== ch.username) : [...prev, ch.username]
                      )}>
                      <span style={st.chCheck}>{active ? "✓" : ""}</span>
                      @{ch.username}
                      {ch.title && <span style={st.chTitle}>{ch.title}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={st.divider} />

          {/* Category */}
          {categories.length > 0 && (
            <div style={st.field}>
              <label style={st.label}>Категория</label>
              <select style={st.select} value={searchCategory}
                onChange={e => setSearchCategory(e.target.value)}>
                <option value="">Все категории</option>
                {categories.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date range */}
          <div style={st.field}>
            <label style={st.label}>Период</label>
            <div style={st.dateRow}>
              <input style={st.dateInput} type="date" value={searchDateFrom}
                onChange={e => setSearchDateFrom(e.target.value)} />
              <span style={st.dateDash}>—</span>
              <input style={st.dateInput} type="date" value={searchDateTo}
                onChange={e => setSearchDateTo(e.target.value)} />
            </div>
          </div>

          {/* Sort */}
          <div style={st.field}>
            <label style={st.label}>Сортировка</label>
            <div style={st.sortRow}>
              <select style={{ ...st.select, flex: 1 }} value={searchSort}
                onChange={e => setSearchSort(e.target.value)}>
                <option value="date">По дате</option>
                <option value="views">По просмотрам</option>
                <option value="reactions">По реакциям</option>
                <option value="comments">По комментариям</option>
                <option value="views_dev">Откл. просмотров</option>
              </select>
              <button style={st.orderToggle}
                onClick={() => setSearchOrder(o => o === "desc" ? "asc" : "desc")}>
                {searchOrder === "desc" ? "↓" : "↑"}
              </button>
            </div>
          </div>

          <div style={st.divider} />

          {/* Filters */}
          <div style={st.sectionTitle}>Дополнительные фильтры</div>

          <div style={st.filtersGrid}>
            <label style={st.filterChip}>
              <input type="checkbox" checked={searchOnlyPhoto}
                onChange={e => setSearchOnlyPhoto(e.target.checked)} />
              Только с фото
            </label>
            <label style={st.filterChip}>
              <input type="checkbox" checked={searchOnlyAd}
                onChange={e => setSearchOnlyAd(e.target.checked)} />
              Только реклама
            </label>
          </div>

          <div style={st.rangeFilters}>
            <div style={st.field}>
              <label style={st.label}>Мин. просмотров</label>
              <input style={st.input} type="number" value={searchMinViews}
                onChange={e => setSearchMinViews(e.target.value)} placeholder="0" />
            </div>
            <div style={st.field}>
              <label style={st.label}>Мин. реакций</label>
              <input style={st.input} type="number" value={searchMinReactions}
                onChange={e => setSearchMinReactions(e.target.value)} placeholder="0" />
            </div>
          </div>

          {/* Actions */}
          <button
            style={{ ...st.addBtn, ...(searchQuery.trim() ? {} : { opacity: 0.4, cursor: "not-allowed" }) }}
            onClick={handleSearchAdd}
            disabled={!searchQuery.trim()}
          >
            <Search size={14} /> Создать поиск
          </button>
          <button style={st.backBtn} onClick={() => { setStep("presets"); setSelectedPreset(null); }}>
            ← Назад к шаблонам
          </button>
        </div>
      )}

      {/* ===== TRACKING WIZARD ===== */}
      {step === "tracking" && (
        <div style={st.form}>
          {/* Steps indicator */}
          <div style={st.stepsBar}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ ...st.stepDot, ...(trackStep >= s ? st.stepDotActive : {}) }}>
                {s}
              </div>
            ))}
            <div style={st.stepsLabel}>
              {trackStep === 1 && "Тип отслеживания"}
              {trackStep === 2 && "Настройка"}
              {trackStep === 3 && "Таргетинг"}
            </div>
          </div>

          {/* Step 1: Choose type */}
          {trackStep === 1 && (
            <>
              <div style={st.sectionTitle}>Выбрать тип отслеживания</div>
              <button
                style={{ ...st.trackTypeBtn, ...(trackType === "words" ? st.trackTypeBtnActive : {}) }}
                onClick={() => setTrackType("words")}
              >
                <div style={{ ...st.trackTypeIcon, color: "var(--tg-accent)" }}>
                  <Hash size={22} />
                </div>
                <div style={st.trackTypeInfo}>
                  <span style={st.trackTypeTitle}>Слова и фразы</span>
                  <span style={st.trackTypeDesc}>Мониторинг появления слов в постах каналов</span>
                </div>
                {trackType === "words" && <span style={st.checkMark}>✓</span>}
              </button>
              <button
                style={{ ...st.trackTypeBtn, ...(trackType === "channels" ? st.trackTypeBtnActive : {}) }}
                onClick={() => setTrackType("channels")}
              >
                <div style={{ ...st.trackTypeIcon, color: "var(--tg-green)" }}>
                  <Users size={22} />
                </div>
                <div style={st.trackTypeInfo}>
                  <span style={st.trackTypeTitle}>Каналы или чаты</span>
                  <span style={st.trackTypeDesc}>Лента конкретных каналов в реальном времени</span>
                </div>
                {trackType === "channels" && <span style={st.checkMark}>✓</span>}
              </button>
            </>
          )}

          {/* Step 2: Configure */}
          {trackStep === 2 && trackType === "words" && (
            <>
              <div style={st.sectionTitle}>Слова и фразы для мониторинга</div>
              <div style={st.field}>
                <label style={st.label}>Поисковый запрос</label>
                <input style={st.input} value={trackKeywords}
                  onChange={e => setTrackKeywords(e.target.value)}
                  placeholder="Например: ChatGPT, нейросеть" autoFocus />
                <span style={st.hint}>Можно указать несколько слов через запятую</span>
              </div>

              <div style={st.divider} />
              <div style={st.sectionTitle}>Мониторить в:</div>

              <div style={st.scopeOptions}>
                <button style={{ ...st.scopeBtn, ...(trackScope === "all" ? st.scopeBtnActive : {}) }}
                  onClick={() => setTrackScope("all")}>
                  <Globe size={14} />
                  <span>В любом канале</span>
                </button>
                <button style={{ ...st.scopeBtn, ...(trackScope === "include" ? st.scopeBtnActive : {}) }}
                  onClick={() => setTrackScope("include")}>
                  <Search size={14} />
                  <span>Только в определённых каналах</span>
                </button>
                <button style={{ ...st.scopeBtn, ...(trackScope === "exclude" ? st.scopeBtnActive : {}) }}
                  onClick={() => setTrackScope("exclude")}>
                  <X size={14} />
                  <span>Исключить каналы из поиска</span>
                </button>
              </div>

              {(trackScope === "include" || trackScope === "exclude") && (
                <div style={st.field}>
                  <label style={st.label}>
                    {trackScope === "include" ? "Искать только в" : "Исключить из поиска"}{" "}
                    {trackScopeChannels.length > 0 && `(${trackScopeChannels.length})`}
                  </label>
                  <input style={st.input} placeholder="Поиск каналов..."
                    value={chSearch} onChange={e => setChSearch(e.target.value)} />
                  {trackScopeChannels.length > 0 && (
                    <div style={st.chipRow}>
                      {trackScopeChannels.map(u => (
                        <span key={u} style={st.chip}>
                          @{u}
                          <button style={st.chipX} onClick={() => setTrackScopeChannels(p => p.filter(x => x !== u))}>
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={st.chList}>
                    {trackFiltered.slice(0, 40).map(ch => {
                      const active = trackScopeChannels.includes(ch.username);
                      return (
                        <button key={ch.username}
                          style={{ ...st.chItem, ...(active ? st.chItemActive : {}) }}
                          onClick={() => setTrackScopeChannels(prev =>
                            active ? prev.filter(u => u !== ch.username) : [...prev, ch.username]
                          )}>
                          <span style={st.chCheck}>{active ? "✓" : ""}</span>
                          @{ch.username}
                          {ch.title && <span style={st.chTitle}>{ch.title}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {trackStep === 2 && trackType === "channels" && (
            <>
              <div style={st.sectionTitle}>Выберите каналы для отслеживания</div>
              <div style={st.field}>
                <label style={st.label}>
                  Каналы {trackScopeChannels.length > 0 && `(${trackScopeChannels.length})`}
                </label>
                <input style={st.input} placeholder="Поиск каналов..."
                  value={chSearch} onChange={e => setChSearch(e.target.value)} />
                {trackScopeChannels.length > 0 && (
                  <div style={st.chipRow}>
                    {trackScopeChannels.map(u => (
                      <span key={u} style={st.chip}>
                        @{u}
                        <button style={st.chipX} onClick={() => setTrackScopeChannels(p => p.filter(x => x !== u))}>
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div style={st.chList}>
                  {trackFiltered.slice(0, 40).map(ch => {
                    const active = trackScopeChannels.includes(ch.username);
                    return (
                      <button key={ch.username}
                        style={{ ...st.chItem, ...(active ? st.chItemActive : {}) }}
                        onClick={() => setTrackScopeChannels(prev =>
                          active ? prev.filter(u => u !== ch.username) : [...prev, ch.username]
                        )}>
                        <span style={st.chCheck}>{active ? "✓" : ""}</span>
                        @{ch.username}
                        {ch.title && <span style={st.chTitle}>{ch.title}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Step 3: Targeting */}
          {trackStep === 3 && (
            <>
              <div style={st.sectionTitle}>Таргетинг (опционально)</div>
              <span style={st.hint}>Дополнительные параметры по каналам</span>

              <div style={st.field}>
                <label style={st.label}>Страна канала</label>
                <select style={st.select} value={trackCountry} onChange={e => setTrackCountry(e.target.value)}>
                  <option value="">Любая</option>
                  <option value="russia">Россия</option>
                  <option value="ukraine">Украина</option>
                  <option value="usa">США</option>
                  <option value="uzbekistan">Узбекистан</option>
                  <option value="iran">Иран</option>
                  <option value="india">Индия</option>
                  <option value="turkey">Турция</option>
                  <option value="international">Международный</option>
                </select>
              </div>

              <div style={st.field}>
                <label style={st.label}>Язык канала</label>
                <select style={st.select} value={trackLanguage} onChange={e => setTrackLanguage(e.target.value)}>
                  <option value="">Любой</option>
                  <option value="ru">Русский</option>
                  <option value="en">Английский</option>
                  <option value="uz">Узбекский</option>
                  <option value="fa">Фарси</option>
                  <option value="ar">Арабский</option>
                  <option value="tr">Турецкий</option>
                  <option value="hi">Хинди</option>
                </select>
              </div>

              <div style={st.field}>
                <label style={st.label}>Категория канала</label>
                <select style={st.select} value={trackCategory} onChange={e => setTrackCategory(e.target.value)}>
                  <option value="">Все категории</option>
                  {categories.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={st.field}>
                <label style={st.label}>Мин. кол-во подписчиков</label>
                <input style={st.input} type="number" value={trackMinSubs}
                  onChange={e => setTrackMinSubs(e.target.value)} placeholder="Например: 1000" />
              </div>
            </>
          )}

          {/* Tracking nav buttons */}
          <div style={st.wizardNav}>
            {trackStep > 1 ? (
              <button style={st.wizardBackBtn} onClick={() => setTrackStep(p => p - 1)}>
                <ChevronLeft size={14} /> Назад
              </button>
            ) : (
              <button style={st.backBtn} onClick={() => { setStep("presets"); setSelectedPreset(null); }}>
                ← К шаблонам
              </button>
            )}

            {trackStep < 3 ? (
              <button
                style={{ ...st.wizardNextBtn, ...(canTrackNext() ? {} : st.wizardNextBtnDisabled) }}
                onClick={() => canTrackNext() && setTrackStep(p => p + 1)}
                disabled={!canTrackNext()}
              >
                Далее <ChevronRight size={14} />
              </button>
            ) : (
              <button style={st.addBtn} onClick={handleTrackingAdd}>
                <Activity size={14} /> Создать отслеживание
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===== CUSTOM ===== */}
      {step === "custom" && (
        <div style={st.form}>
          <div style={st.field}>
            <label style={st.label}>Название</label>
            <input style={st.input} value={customTitle}
              onChange={e => setCustomTitle(e.target.value)} placeholder="Моя колонка" />
          </div>
          <div style={st.field}>
            <label style={st.label}>Тип</label>
            <div style={st.typeRow}>
              <button style={{ ...st.typeBtn, ...(customType === "posts" ? st.typeBtnActive : {}) }}
                onClick={() => setCustomType("posts")}>Посты</button>
              <button style={{ ...st.typeBtn, ...(customType === "feed" ? st.typeBtnActive : {}) }}
                onClick={() => setCustomType("feed")}>Каналы</button>
            </div>
          </div>
          {customType === "posts" && categories.length > 0 && (
            <div style={st.field}>
              <label style={st.label}>Категория</label>
              <select style={st.select} value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}>
                <option value="">Все</option>
                {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          )}
          {customType === "posts" && (
            <div style={st.field}>
              <label style={st.label}>Каналы {selectedChannels.length > 0 && `(${selectedChannels.length})`}</label>
              <input style={st.input} placeholder="Поиск..." value={chSearch} onChange={e => setChSearch(e.target.value)} />
              <div style={st.chList}>
                {filtered.slice(0, 50).map(ch => {
                  const active = selectedChannels.includes(ch.username);
                  return (
                    <button key={ch.username}
                      style={{ ...st.chItem, ...(active ? st.chItemActive : {}) }}
                      onClick={() => setSelectedChannels(prev =>
                        active ? prev.filter(u => u !== ch.username) : [...prev, ch.username]
                      )}>
                      <span style={st.chCheck}>{active ? "✓" : ""}</span>
                      @{ch.username}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <button style={st.addBtn} onClick={handleCustomAdd}>Добавить колонку</button>
          <button style={st.backBtn} onClick={() => setStep("presets")}>← Назад к шаблонам</button>
        </div>
      )}
    </div>
  );
}

const st = {
  column: {
    width: 380, minWidth: 380, height: "100%", display: "flex", flexDirection: "column",
    borderRight: "1px solid var(--tg-border)", background: "var(--tg-bg-secondary)",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 14px", borderBottom: "1px solid var(--tg-border)",
  },
  headerTitle: { fontSize: 14, fontWeight: 700, color: "var(--tg-text)" },
  closeBtn: {
    width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
    border: "none", borderRadius: 8, background: "transparent", color: "var(--tg-text-muted)", cursor: "pointer",
  },
  presetsList: {
    flex: 1, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 4,
  },
  presetBtn: {
    display: "flex", alignItems: "center", gap: 12, padding: "12px 12px",
    border: "1px solid var(--tg-border)", borderRadius: 12, background: "var(--tg-bg-panel)",
    cursor: "pointer", textAlign: "left", width: "100%", color: "var(--tg-text)",
    transition: "border-color 0.15s, background 0.15s",
  },
  presetIcon: {
    width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: 10, flexShrink: 0,
  },
  presetInfo: { display: "flex", flexDirection: "column", gap: 2 },
  presetTitle: { fontSize: 14, fontWeight: 600 },
  presetDesc: { fontSize: 12, color: "var(--tg-text-muted)" },

  form: {
    flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10,
  },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: {
    fontSize: 11, fontWeight: 600, color: "var(--tg-text-muted)", textTransform: "uppercase", letterSpacing: 0.3,
  },
  hint: { fontSize: 11, color: "var(--tg-text-muted)", fontStyle: "italic" },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: "var(--tg-text)", marginTop: 4 },
  divider: { height: 1, background: "var(--tg-border)", margin: "4px 0" },
  input: {
    background: "var(--tg-bg-input)", color: "var(--tg-text)",
    border: "1px solid var(--tg-border)", borderRadius: 8, padding: "8px 10px", fontSize: 13, outline: "none",
  },
  select: {
    background: "var(--tg-bg-input)", color: "var(--tg-text)",
    border: "1px solid var(--tg-border)", borderRadius: 8, padding: "8px 10px",
    fontSize: 13, outline: "none", cursor: "pointer",
  },

  // Steps bar
  stepsBar: {
    display: "flex", alignItems: "center", gap: 8, padding: "6px 0 10px",
    borderBottom: "1px solid var(--tg-border)", marginBottom: 4,
  },
  stepDot: {
    width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 700, background: "var(--tg-bg-input)", color: "var(--tg-text-muted)",
    border: "1px solid var(--tg-border)", flexShrink: 0,
  },
  stepDotActive: {
    background: "var(--tg-accent-muted)", color: "var(--tg-accent)", borderColor: "var(--tg-accent)",
  },
  stepsLabel: { fontSize: 12, color: "var(--tg-text-secondary)", fontWeight: 500, marginLeft: 4 },

  // Track type buttons
  trackTypeBtn: {
    display: "flex", alignItems: "center", gap: 12, padding: "14px 12px",
    border: "1px solid var(--tg-border)", borderRadius: 12, background: "var(--tg-bg-panel)",
    cursor: "pointer", textAlign: "left", width: "100%", color: "var(--tg-text)",
    transition: "border-color 0.15s",
  },
  trackTypeBtnActive: {
    borderColor: "var(--tg-accent)", background: "var(--tg-accent-muted)",
  },
  trackTypeIcon: {
    width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: 12, background: "rgba(255,255,255,0.05)", flexShrink: 0,
  },
  trackTypeInfo: { display: "flex", flexDirection: "column", gap: 2, flex: 1 },
  trackTypeTitle: { fontSize: 14, fontWeight: 600 },
  trackTypeDesc: { fontSize: 12, color: "var(--tg-text-muted)" },
  checkMark: {
    fontSize: 16, fontWeight: 700, color: "var(--tg-accent)", flexShrink: 0,
  },

  // Scope options
  scopeOptions: { display: "flex", flexDirection: "column", gap: 4 },
  scopeBtn: {
    display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
    border: "1px solid var(--tg-border)", borderRadius: 8, background: "var(--tg-bg-panel)",
    cursor: "pointer", color: "var(--tg-text-secondary)", fontSize: 12, fontWeight: 500,
    textAlign: "left", width: "100%", transition: "all 0.15s",
  },
  scopeBtnActive: {
    borderColor: "var(--tg-accent)", background: "var(--tg-accent-muted)", color: "var(--tg-accent)",
  },

  // Chips
  chipRow: { display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 },
  chip: {
    display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px",
    borderRadius: 6, fontSize: 11, fontWeight: 500, background: "var(--tg-accent-muted)", color: "var(--tg-accent)",
  },
  chipX: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 14, height: 14, border: "none", background: "transparent", color: "var(--tg-accent)", cursor: "pointer",
  },

  // Channel list
  chList: {
    maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1,
    border: "1px solid var(--tg-border)", borderRadius: 8, padding: 3,
  },
  chItem: {
    display: "flex", alignItems: "center", gap: 6, padding: "5px 8px",
    background: "transparent", border: "none", borderRadius: 6,
    color: "var(--tg-text-secondary)", fontSize: 12, cursor: "pointer", textAlign: "left", width: "100%",
  },
  chItemActive: { background: "var(--tg-accent-muted)", color: "var(--tg-accent)" },
  chCheck: { width: 14, fontSize: 11, color: "var(--tg-accent)", fontWeight: 700 },
  chTitle: {
    fontSize: 11, color: "var(--tg-text-muted)", marginLeft: 4,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },

  // Search wizard
  dateRow: {
    display: "flex", alignItems: "center", gap: 6,
  },
  dateInput: {
    flex: 1, background: "var(--tg-bg-input)", color: "var(--tg-text)",
    border: "1px solid var(--tg-border)", borderRadius: 8, padding: "7px 8px",
    fontSize: 12, outline: "none", colorScheme: "dark",
  },
  dateDash: { color: "var(--tg-text-muted)", fontSize: 12, flexShrink: 0 },
  sortRow: { display: "flex", gap: 4 },
  orderToggle: {
    width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
    background: "var(--tg-bg-input)", border: "1px solid var(--tg-border)", borderRadius: 8,
    color: "var(--tg-text)", fontSize: 15, cursor: "pointer", flexShrink: 0,
  },
  filtersGrid: {
    display: "flex", gap: 6, flexWrap: "wrap",
  },
  filterChip: {
    display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
    borderRadius: 8, border: "1px solid var(--tg-border)", background: "var(--tg-bg-panel)",
    fontSize: 12, color: "var(--tg-text-secondary)", cursor: "pointer",
  },
  rangeFilters: {
    display: "flex", gap: 8,
  },

  // Wizard nav
  wizardNav: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginTop: 8, paddingTop: 10, borderTop: "1px solid var(--tg-border)",
  },
  wizardBackBtn: {
    display: "flex", alignItems: "center", gap: 4, padding: "8px 12px",
    border: "none", background: "transparent", color: "var(--tg-text-muted)",
    fontSize: 13, cursor: "pointer",
  },
  wizardNextBtn: {
    display: "flex", alignItems: "center", gap: 4, padding: "8px 16px",
    border: "none", borderRadius: 8, background: "var(--tg-accent)", color: "#fff",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  wizardNextBtnDisabled: { opacity: 0.4, cursor: "not-allowed" },

  // Shared buttons
  typeRow: { display: "flex", gap: 6 },
  typeBtn: {
    flex: 1, padding: "8px 0", border: "1px solid var(--tg-border)", borderRadius: 8,
    background: "var(--tg-bg-panel)", color: "var(--tg-text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer",
  },
  typeBtnActive: { background: "var(--tg-accent-muted)", color: "var(--tg-accent)", borderColor: "var(--tg-accent)" },
  addBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "10px 0", borderRadius: 10, border: "none", background: "var(--tg-accent)",
    color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 4,
  },
  backBtn: {
    padding: "8px 0", border: "none", background: "transparent",
    color: "var(--tg-text-muted)", fontSize: 13, cursor: "pointer",
  },
};
