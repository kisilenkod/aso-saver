import { useState, useCallback } from 'react';
import { AppEntry, AppVersion, LocalizationData, Screenshot, LANGUAGES } from '../types';
import { Plus, Trash2, Globe, Image, ChevronDown, ChevronRight, X, GripVertical, ExternalLink, Maximize2, Copy, Pencil, Check, Tag } from 'lucide-react';

interface Props {
  app: AppEntry;
  onUpdate: (app: AppEntry) => void;
  canEdit: boolean;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function AppEditor({ app, onUpdate, canEdit }: Props) {
  const [activeTab, setActiveTab] = useState(0);
  const [showAddLang, setShowAddLang] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editingVersionValue, setEditingVersionValue] = useState('');
  const [showVersionMenu, setShowVersionMenu] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    meta: true, keywords: true, description: true, screenshots: true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Version management
  const activeVersion = app.versions.find(v => v.id === app.activeVersionId) || app.versions[0];
  if (!activeVersion) return null;

  const currentLoc = activeVersion.localizations[activeTab] || activeVersion.localizations[0];
  if (!currentLoc) return null;

  const updateVersion = (updatedVersion: AppVersion) => {
    const updated = { ...app };
    updated.versions = app.versions.map(v => v.id === updatedVersion.id ? updatedVersion : v);
    onUpdate(updated);
  };

  const updateField = (field: string, value: string) => {
    const updatedVersion = { ...activeVersion };
    updatedVersion.localizations = [...activeVersion.localizations];
    updatedVersion.localizations[activeTab] = { ...currentLoc, [field]: value };
    updateVersion(updatedVersion);
  };

  const updateAppMeta = (field: string, value: string) => {
    onUpdate({ ...app, [field]: value });
  };

  const handleIconUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        onUpdate({ ...app, icon: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // Version CRUD
  const addVersion = () => {
    // Clone current version's localizations as starting point
    const clonedLocalizations = activeVersion.localizations.map(loc => ({
      ...loc,
      screenshots: loc.screenshots.map(s => ({ ...s, id: generateId() })),
    }));

    // Determine next version number
    const existingVersions = app.versions.map(v => v.version).sort();
    const lastVersion = existingVersions[existingVersions.length - 1] || '1.0';
    const parts = lastVersion.split('.');
    const minor = parseInt(parts[1] || '0') + 1;
    const nextVersion = `${parts[0]}.${minor}`;

    const newVersion: AppVersion = {
      id: generateId(),
      version: nextVersion,
      localizations: clonedLocalizations,
      createdAt: Date.now(),
    };
    onUpdate({
      ...app,
      versions: [...app.versions, newVersion],
      activeVersionId: newVersion.id,
    });
    setActiveTab(0);
    setShowVersionMenu(false);
  };

  const deleteVersion = (versionId: string) => {
    if (app.versions.length <= 1) return;
    const remaining = app.versions.filter(v => v.id !== versionId);
    onUpdate({
      ...app,
      versions: remaining,
      activeVersionId: app.activeVersionId === versionId ? remaining[remaining.length - 1].id : app.activeVersionId,
    });
    setShowVersionMenu(false);
  };

  const switchVersion = (versionId: string) => {
    onUpdate({ ...app, activeVersionId: versionId });
    setActiveTab(0);
    setShowVersionMenu(false);
  };

  const startEditVersion = (v: AppVersion) => {
    setEditingVersionId(v.id);
    setEditingVersionValue(v.version);
  };

  const saveEditVersion = () => {
    if (!editingVersionId || !editingVersionValue.trim()) return;
    const updated = { ...app };
    updated.versions = app.versions.map(v =>
      v.id === editingVersionId ? { ...v, version: editingVersionValue.trim() } : v
    );
    onUpdate(updated);
    setEditingVersionId(null);
  };

  const duplicateVersion = (sourceVersion: AppVersion) => {
    const clonedLocalizations = sourceVersion.localizations.map(loc => ({
      ...loc,
      screenshots: loc.screenshots.map(s => ({ ...s, id: generateId() })),
    }));
    const newVersion: AppVersion = {
      id: generateId(),
      version: `${sourceVersion.version}-copy`,
      localizations: clonedLocalizations,
      createdAt: Date.now(),
    };
    onUpdate({
      ...app,
      versions: [...app.versions, newVersion],
      activeVersionId: newVersion.id,
    });
    setActiveTab(0);
    setShowVersionMenu(false);
  };

  // Language management
  const addLanguage = (langCode: string) => {
    const newLoc: LocalizationData = {
      language: langCode,
      title: '',
      subtitle: '',
      keywords: '',
      description: '',
      screenshots: [],
    };
    const updatedVersion = { ...activeVersion, localizations: [...activeVersion.localizations, newLoc] };
    updateVersion(updatedVersion);
    setActiveTab(activeVersion.localizations.length);
    setShowAddLang(false);
  };

  const removeLanguage = (index: number) => {
    if (activeVersion.localizations.length <= 1) return;
    const updated = activeVersion.localizations.filter((_, i) => i !== index);
    updateVersion({ ...activeVersion, localizations: updated });
    if (activeTab >= updated.length) setActiveTab(updated.length - 1);
  };

  // Screenshots
  const addScreenshots = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      const newScreenshots: Screenshot[] = [];
      let loaded = 0;

      fileArray.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          newScreenshots.push({
            id: generateId(),
            url: ev.target?.result as string,
            name: file.name,
          });
          loaded++;
          if (loaded === fileArray.length) {
            const updatedVersion = { ...activeVersion };
            updatedVersion.localizations = [...activeVersion.localizations];
            const loc = { ...updatedVersion.localizations[activeTab] };
            loc.screenshots = [...loc.screenshots, ...newScreenshots];
            updatedVersion.localizations[activeTab] = loc;
            const updatedApp = { ...app };
            updatedApp.versions = app.versions.map(v => v.id === activeVersion.id ? updatedVersion : v);
            onUpdate(updatedApp);
          }
        };
        reader.readAsDataURL(file);
      });
    };
    input.click();
  }, [app, activeVersion, activeTab, onUpdate]);

  const removeScreenshot = (screenshotId: string) => {
    const updatedVersion = { ...activeVersion };
    updatedVersion.localizations = [...activeVersion.localizations];
    const loc = { ...updatedVersion.localizations[activeTab] };
    loc.screenshots = loc.screenshots.filter(s => s.id !== screenshotId);
    updatedVersion.localizations[activeTab] = loc;
    updateVersion(updatedVersion);
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index); };
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) { setDragIndex(null); setDragOverIndex(null); return; }
    const updatedVersion = { ...activeVersion };
    updatedVersion.localizations = [...activeVersion.localizations];
    const loc = { ...updatedVersion.localizations[activeTab] };
    const screenshots = [...loc.screenshots];
    const [moved] = screenshots.splice(dragIndex, 1);
    screenshots.splice(dropIndex, 0, moved);
    loc.screenshots = screenshots;
    updatedVersion.localizations[activeTab] = loc;
    updateVersion(updatedVersion);
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => { setDragIndex(null); setDragOverIndex(null); };

  const existingLangs = new Set(activeVersion.localizations.map(l => l.language));
  const availableLangs = LANGUAGES.filter(l => !existingLangs.has(l.code));
  const langName = LANGUAGES.find(l => l.code === currentLoc.language)?.name || currentLoc.language;
  const keywordsCount = currentLoc.keywords.length;
  const descriptionCount = currentLoc.description.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* App Meta: Icon + fields */}
      <div className="flex gap-4 items-start">
        <div
          onClick={handleIconUpload}
          className="w-20 h-20 shrink-0 rounded-2xl border-2 border-dashed border-gray-700 hover:border-blue-500 cursor-pointer flex items-center justify-center overflow-hidden bg-gray-900 transition-colors group"
          title="Upload app icon"
        >
          {app.icon ? (
            <img src={app.icon} alt="App Icon" className="w-full h-full object-cover rounded-2xl" />
          ) : (
            <div className="text-center">
              <Image size={20} className="mx-auto text-gray-600 group-hover:text-blue-500 transition-colors" />
              <p className="text-[9px] text-gray-600 mt-0.5">Icon</p>
            </div>
          )}
        </div>

        <div className="flex-1 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">App Name</label>
            <input type="text" value={app.name} onChange={e => updateAppMeta('name', e.target.value)} readOnly={!canEdit}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" placeholder="My App" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Bundle ID</label>
            <input type="text" value={app.bundleId} onChange={e => updateAppMeta('bundleId', e.target.value)} readOnly={!canEdit}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" placeholder="com.company.app" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">App Store URL</label>
            <div className="flex gap-2">
              <input type="url" value={app.appStoreUrl || ''} onChange={e => updateAppMeta('appStoreUrl', e.target.value)} readOnly={!canEdit}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" placeholder="https://apps.apple.com/app/..." />
              {app.appStoreUrl && (
                <a href={app.appStoreUrl} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors">
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Version Selector */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-300">Versions</span>
          </div>
          {canEdit && (
            <button
              onClick={addVersion}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus size={14} />
              New Version
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {app.versions.map(v => (
            <div key={v.id} className={`group flex items-center gap-1 rounded-lg border transition-colors ${
              v.id === app.activeVersionId
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
            }`}>
              {editingVersionId === v.id ? (
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <input
                    type="text"
                    value={editingVersionValue}
                    onChange={e => setEditingVersionValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEditVersion(); if (e.key === 'Escape') setEditingVersionId(null); }}
                    className="w-16 px-1 py-0 bg-transparent border-b border-blue-500 text-sm text-white focus:outline-none"
                    autoFocus
                  />
                  <button onClick={saveEditVersion} className="p-0.5 text-green-400 hover:text-green-300"><Check size={12} /></button>
                  <button onClick={() => setEditingVersionId(null)} className="p-0.5 text-gray-500 hover:text-white"><X size={12} /></button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => switchVersion(v.id)}
                    className="px-3 py-1.5 text-sm font-medium"
                  >
                    {v.version}
                  </button>
                  {canEdit && (
                    <div className="flex items-center gap-0.5 pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEditVersion(v)} className="p-0.5 hover:text-white" title="Rename">
                        <Pencil size={11} />
                      </button>
                      <button onClick={() => duplicateVersion(v)} className="p-0.5 hover:text-white" title="Duplicate">
                        <Copy size={11} />
                      </button>
                      {app.versions.length > 1 && (
                        <button onClick={() => deleteVersion(v.id)} className="p-0.5 hover:text-red-400" title="Delete">
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-2">
          {new Date(activeVersion.createdAt).toLocaleDateString()} — Each version stores its own set of metadata for all languages
        </p>
      </div>

      {/* Language Tabs */}
      <div className="flex items-center gap-1 flex-wrap border-b border-gray-800 pb-2">
        <Globe size={16} className="text-gray-500 mr-1" />
        {activeVersion.localizations.map((loc, i) => {
          const ln = LANGUAGES.find(l => l.code === loc.language)?.name || loc.language;
          return (
            <div key={loc.language} className="group flex items-center">
              <button onClick={() => setActiveTab(i)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  i === activeTab ? 'bg-blue-600/20 text-blue-400 font-medium' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}>{ln}</button>
              {activeVersion.localizations.length > 1 && (
                <button onClick={() => removeLanguage(i)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-500 hover:text-red-400 transition-all"><X size={12} /></button>
              )}
            </div>
          );
        })}
        <div className="relative">
          <button onClick={() => setShowAddLang(!showAddLang)}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"><Plus size={16} /></button>
          {showAddLang && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto">
              {availableLangs.map(lang => (
                <button key={lang.code} onClick={() => addLanguage(lang.code)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors first:rounded-t-xl last:rounded-b-xl">
                  {lang.name} <span className="text-gray-500">({lang.code})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Title & Subtitle */}
      <Section title="Title & Subtitle" sectionKey="meta" expanded={expandedSections.meta} onToggle={toggleSection}>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-400">Title</label>
              <span className={`text-xs ${currentLoc.title.length > 30 ? 'text-red-400' : 'text-gray-500'}`}>{currentLoc.title.length}/30</span>
            </div>
            <input type="text" value={currentLoc.title} onChange={e => updateField('title', e.target.value)} readOnly={!canEdit}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" placeholder={`App title (${langName})`} />
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-400">Subtitle</label>
              <span className={`text-xs ${currentLoc.subtitle.length > 30 ? 'text-red-400' : 'text-gray-500'}`}>{currentLoc.subtitle.length}/30</span>
            </div>
            <input type="text" value={currentLoc.subtitle} onChange={e => updateField('subtitle', e.target.value)} readOnly={!canEdit}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" placeholder={`App subtitle (${langName})`} />
          </div>
        </div>
      </Section>

      {/* Keywords */}
      <Section title="Keywords" sectionKey="keywords" expanded={expandedSections.keywords} onToggle={toggleSection}>
        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-400">Keywords (comma-separated)</label>
            <span className={`text-xs ${keywordsCount > 100 ? 'text-red-400' : 'text-gray-500'}`}>{keywordsCount}/100</span>
          </div>
          <textarea value={currentLoc.keywords} onChange={e => updateField('keywords', e.target.value)} readOnly={!canEdit} rows={3}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
            placeholder="keyword1,keyword2,keyword3" />
        </div>
      </Section>

      {/* Description */}
      <Section title="Description" sectionKey="description" expanded={expandedSections.description} onToggle={toggleSection}>
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-medium text-gray-400">Description</label>
            <span className={`text-xs ${descriptionCount > 4000 ? 'text-red-400' : 'text-gray-500'}`}>{descriptionCount}/4000</span>
          </div>
          <textarea value={currentLoc.description} onChange={e => updateField('description', e.target.value)} readOnly={!canEdit} rows={10}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 resize-y"
            placeholder={`App description (${langName})`} />
        </div>
      </Section>

      {/* Screenshots */}
      <Section title={`Screenshots (${currentLoc.screenshots.length})`} sectionKey="screenshots" expanded={expandedSections.screenshots} onToggle={toggleSection}>
        <div>
          {currentLoc.screenshots.length > 0 && (
            <div className="flex gap-3 mb-3 overflow-x-auto pb-2">
              {currentLoc.screenshots.map((screenshot, index) => (
                <div key={screenshot.id} draggable onDragStart={() => handleDragStart(index)} onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)} onDragEnd={handleDragEnd}
                  className={`relative group shrink-0 transition-all ${dragOverIndex === index ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-950 rounded-lg' : ''} ${dragIndex === index ? 'opacity-40' : ''}`}>
                  <div className="absolute top-1 left-1 p-1 bg-black/60 rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-grab active:cursor-grabbing z-10">
                    <GripVertical size={12} className="text-white" />
                  </div>
                  <button onClick={() => setPreviewImage(screenshot.url)}
                    className="absolute top-1 left-1/2 -translate-x-1/2 p-1 bg-black/60 hover:bg-black/80 rounded-md opacity-0 group-hover:opacity-100 transition-all z-10" title="Preview">
                    <Maximize2 size={12} className="text-white" />
                  </button>
                  <button onClick={() => removeScreenshot(screenshot.id)}
                    className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-all z-10" title="Remove">
                    <Trash2 size={12} className="text-white" />
                  </button>
                  <img src={screenshot.url} alt={screenshot.name} className="h-48 w-auto rounded-lg border border-gray-700 object-cover cursor-pointer"
                    onClick={() => setPreviewImage(screenshot.url)} />
                  <p className="text-xs text-gray-500 mt-1 max-w-[120px] truncate">{screenshot.name}</p>
                </div>
              ))}
            </div>
          )}
          {canEdit && (
            <button onClick={addScreenshots}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors">
              <Image size={16} />
              Add Screenshots
            </button>
          )}
        </div>
      </Section>

      {/* Image Preview Lightbox */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] cursor-pointer" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors" onClick={() => setPreviewImage(null)}>
            <X size={24} />
          </button>
          <img src={previewImage} alt="Preview" className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

function Section({ title, sectionKey, expanded, onToggle, children }: {
  title: string; sectionKey: string; expanded: boolean; onToggle: (key: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
      <button onClick={() => onToggle(sectionKey)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors">
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {title}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
