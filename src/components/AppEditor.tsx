import { useState } from 'react';
import { AppEntry, LocalizationData, LANGUAGES } from '../types';
import { Plus, Trash2, Globe, History, Image, ChevronDown, ChevronRight, Save, X } from 'lucide-react';
import VersionHistory from './VersionHistory';

interface Props {
  app: AppEntry;
  onUpdate: (app: AppEntry) => void;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function AppEditor({ app, onUpdate }: Props) {
  const [activeTab, setActiveTab] = useState(0);
  const [showAddLang, setShowAddLang] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    meta: true, keywords: true, description: true, screenshots: true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const currentLoc = app.localizations[activeTab] || app.localizations[0];
  if (!currentLoc) return null;

  const updateField = (field: string, value: string) => {
    const updated = { ...app };
    updated.localizations = [...app.localizations];
    updated.localizations[activeTab] = { ...currentLoc, [field]: value };
    onUpdate(updated);
  };

  const updateAppMeta = (field: string, value: string) => {
    onUpdate({ ...app, [field]: value });
  };

  const addLanguage = (langCode: string) => {
    const newLoc: LocalizationData = {
      language: langCode,
      title: '',
      subtitle: '',
      keywords: '',
      description: '',
      screenshots: [],
    };
    onUpdate({ ...app, localizations: [...app.localizations, newLoc] });
    setActiveTab(app.localizations.length);
    setShowAddLang(false);
  };

  const removeLanguage = (index: number) => {
    if (app.localizations.length <= 1) return;
    const updated = app.localizations.filter((_, i) => i !== index);
    onUpdate({ ...app, localizations: updated });
    if (activeTab >= updated.length) setActiveTab(updated.length - 1);
  };

  const saveDescriptionVersion = () => {
    const version = {
      id: generateId(),
      language: currentLoc.language,
      description: currentLoc.description,
      timestamp: Date.now(),
      label: `v${app.descriptionVersions.filter(v => v.language === currentLoc.language).length + 1}`,
    };
    onUpdate({ ...app, descriptionVersions: [...app.descriptionVersions, version] });
  };

  const restoreVersion = (description: string) => {
    updateField('description', description);
    setShowVersions(false);
  };

  const addScreenshot = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const screenshot = {
            id: generateId(),
            url: ev.target?.result as string,
            name: file.name,
          };
          const updatedApp = { ...app };
          updatedApp.localizations = [...app.localizations];
          const loc = { ...updatedApp.localizations[activeTab] };
          loc.screenshots = [...loc.screenshots, screenshot];
          updatedApp.localizations[activeTab] = loc;
          onUpdate(updatedApp);
        };
        reader.readAsDataURL(file);
      });
    };
    input.click();
  };

  const removeScreenshot = (screenshotId: string) => {
    const updatedApp = { ...app };
    updatedApp.localizations = [...app.localizations];
    const loc = { ...updatedApp.localizations[activeTab] };
    loc.screenshots = loc.screenshots.filter(s => s.id !== screenshotId);
    updatedApp.localizations[activeTab] = loc;
    onUpdate(updatedApp);
  };

  const existingLangs = new Set(app.localizations.map(l => l.language));
  const availableLangs = LANGUAGES.filter(l => !existingLangs.has(l.code));
  const langName = LANGUAGES.find(l => l.code === currentLoc.language)?.name || currentLoc.language;

  const keywordsCount = currentLoc.keywords.length;
  const descriptionCount = currentLoc.description.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* App Meta */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">App Name</label>
          <input
            type="text"
            value={app.name}
            onChange={e => updateAppMeta('name', e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            placeholder="My App"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Bundle ID</label>
          <input
            type="text"
            value={app.bundleId}
            onChange={e => updateAppMeta('bundleId', e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            placeholder="com.company.app"
          />
        </div>
      </div>

      {/* Language Tabs */}
      <div className="flex items-center gap-1 flex-wrap border-b border-gray-800 pb-2">
        <Globe size={16} className="text-gray-500 mr-1" />
        {app.localizations.map((loc, i) => {
          const ln = LANGUAGES.find(l => l.code === loc.language)?.name || loc.language;
          return (
            <div key={loc.language} className="group flex items-center">
              <button
                onClick={() => setActiveTab(i)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  i === activeTab
                    ? 'bg-blue-600/20 text-blue-400 font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {ln}
              </button>
              {app.localizations.length > 1 && (
                <button
                  onClick={() => removeLanguage(i)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-500 hover:text-red-400 transition-all"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}
        <div className="relative">
          <button
            onClick={() => setShowAddLang(!showAddLang)}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Plus size={16} />
          </button>
          {showAddLang && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto">
              {availableLangs.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => addLanguage(lang.code)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors first:rounded-t-xl last:rounded-b-xl"
                >
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
              <span className={`text-xs ${currentLoc.title.length > 30 ? 'text-red-400' : 'text-gray-500'}`}>
                {currentLoc.title.length}/30
              </span>
            </div>
            <input
              type="text"
              value={currentLoc.title}
              onChange={e => updateField('title', e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder={`App title (${langName})`}
            />
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-400">Subtitle</label>
              <span className={`text-xs ${currentLoc.subtitle.length > 30 ? 'text-red-400' : 'text-gray-500'}`}>
                {currentLoc.subtitle.length}/30
              </span>
            </div>
            <input
              type="text"
              value={currentLoc.subtitle}
              onChange={e => updateField('subtitle', e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder={`App subtitle (${langName})`}
            />
          </div>
        </div>
      </Section>

      {/* Keywords */}
      <Section title="Keywords" sectionKey="keywords" expanded={expandedSections.keywords} onToggle={toggleSection}>
        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-400">Keywords (comma-separated)</label>
            <span className={`text-xs ${keywordsCount > 100 ? 'text-red-400' : 'text-gray-500'}`}>
              {keywordsCount}/100
            </span>
          </div>
          <textarea
            value={currentLoc.keywords}
            onChange={e => updateField('keywords', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
            placeholder="keyword1,keyword2,keyword3"
          />
        </div>
      </Section>

      {/* Description */}
      <Section title="Description" sectionKey="description" expanded={expandedSections.description} onToggle={toggleSection}>
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-medium text-gray-400">Description</label>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${descriptionCount > 4000 ? 'text-red-400' : 'text-gray-500'}`}>
                {descriptionCount}/4000
              </span>
              <button
                onClick={saveDescriptionVersion}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-400 transition-colors"
                title="Save version"
              >
                <Save size={12} />
                Save version
              </button>
              <button
                onClick={() => setShowVersions(!showVersions)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-400 transition-colors"
                title="Version history"
              >
                <History size={12} />
                History ({app.descriptionVersions.filter(v => v.language === currentLoc.language).length})
              </button>
            </div>
          </div>
          <textarea
            value={currentLoc.description}
            onChange={e => updateField('description', e.target.value)}
            rows={10}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 resize-y"
            placeholder={`App description (${langName})`}
          />
        </div>
        {showVersions && (
          <VersionHistory
            versions={app.descriptionVersions.filter(v => v.language === currentLoc.language)}
            onRestore={restoreVersion}
            onClose={() => setShowVersions(false)}
          />
        )}
      </Section>

      {/* Screenshots */}
      <Section title="Screenshots" sectionKey="screenshots" expanded={expandedSections.screenshots} onToggle={toggleSection}>
        <div>
          <div className="flex flex-wrap gap-3 mb-3">
            {currentLoc.screenshots.map(screenshot => (
              <div key={screenshot.id} className="relative group">
                <img
                  src={screenshot.url}
                  alt={screenshot.name}
                  className="h-48 w-auto rounded-lg border border-gray-700 object-cover"
                />
                <button
                  onClick={() => removeScreenshot(screenshot.id)}
                  className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={12} className="text-white" />
                </button>
                <p className="text-xs text-gray-500 mt-1 max-w-[120px] truncate">{screenshot.name}</p>
              </div>
            ))}
          </div>
          <button
            onClick={addScreenshot}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
          >
            <Image size={16} />
            Add Screenshots
          </button>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, sectionKey, expanded, onToggle, children }: {
  title: string;
  sectionKey: string;
  expanded: boolean;
  onToggle: (key: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => onToggle(sectionKey)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors"
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {title}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
