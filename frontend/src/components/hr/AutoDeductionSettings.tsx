import React from 'react';
import { Clock, TrendingUp, Bell, Calculator, Info, Trash2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SubSettingProps {
  settings: any;
  setSettings: (settings: any) => void;
}

export const Tooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} className="cursor-help">
        {children}
      </div>
      {show && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap max-w-xs">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
        </div>
      )}
    </div>
  );
};

// --- 1. Grace Period & Daily Limit ---
export const PunctualityRules: React.FC<SubSettingProps> = ({ settings, setSettings }) => (
  <div className="space-y-4 p-5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-blue-500" />
        <h4 className="font-bold text-gray-900 dark:text-white">قواعد الحضور ورصيد التسامح</h4>
      </div>
      <div className="px-2 py-0.5 rounded-full text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold border border-green-200 dark:border-green-800">
        نظام نشط دائماً
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>حد التأخير اليومي المسموح</Label>
          <Tooltip content="الوقت المسموح به يومياً قبل اعتبار الموظف 'متأخر'. مثلاً 10 دقائق.">
            <Info className="h-4 w-4 text-gray-400" />
          </Tooltip>
        </div>
        <Input
          type="number"
          min={0}
          value={settings.lateThresholdMinutes}
          onChange={(e) => setSettings({ ...settings, lateThresholdMinutes: parseInt(e.target.value) || 10, lateThreshold: parseInt(e.target.value) || 10 })}
        />
        <p className="text-xs text-gray-500">دقيقة (افتراضي: 10)</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>رصيد التسامح الشهري</Label>
          <Tooltip content="إجمالي الدقائق المسموح للموظف بتجاوزها شهرياً قبل بدء الخصم المالي">
            <Info className="h-4 w-4 text-gray-400" />
          </Tooltip>
        </div>
        <Input
          type="number"
          min={0}
          value={settings.gracePeriodMinutes}
          onChange={(e) => setSettings({ ...settings, gracePeriodMinutes: parseInt(e.target.value) || 60 })}
        />
        <p className="text-xs text-gray-500">دقيقة (افتراضي: 60)</p>
      </div>
    </div>
  </div>
);

// --- 2. Financial Penalties (Escalation) ---
export const FinancialPenalties: React.FC<SubSettingProps> = ({ settings, setSettings }) => {
  const isTieredActive = settings.autoDeductionEnabled && JSON.parse(settings.delayPenaltyTiers || '[]').length > 0;

  return (
    <div className="space-y-6">
      <div className={`flex items-center justify-between p-4 border rounded-xl transition-all duration-300 ${settings.autoDeductionEnabled
          ? 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20 ring-1 ring-orange-500/20'
          : 'border-gray-200 dark:border-gray-800 bg-gray-50/30'
        }`}>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Label className={`font-bold text-lg ${settings.autoDeductionEnabled ? 'text-orange-900 dark:text-orange-100' : 'text-gray-500'}`}>
              تفعيل الجزاءات المالية الآلية
            </Label>
            {settings.autoDeductionEnabled ? (
              <span className="px-2 py-0.5 bg-orange-500 text-white text-[10px] rounded-full font-bold animate-pulse">نشط حالياً ✅</span>
            ) : (
              <span className="px-2 py-0.5 bg-gray-200 text-gray-500 text-[10px] rounded-full font-bold">معطل ⚠️</span>
            )}
          </div>
          <p className={`text-sm ${settings.autoDeductionEnabled ? 'text-orange-700 dark:text-orange-300' : 'text-gray-400'}`}>
            خصم قيمة وقت التأخير من الراتب تلقائياً بعد نفاد رصيد التسامح
          </p>
        </div>
        <Switch
          checked={settings.autoDeductionEnabled}
          onCheckedChange={(checked) => setSettings({ ...settings, autoDeductionEnabled: checked })}
        />
      </div>

      {settings.autoDeductionEnabled && (
        <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between p-4 border border-blue-200 dark:border-blue-800 rounded-xl bg-blue-50/50 dark:bg-blue-950/20">
            <div>
              <Label className="text-blue-900 dark:text-blue-100 font-semibold">مراجعة الـ HR قبل الخصم</Label>
              <p className="text-sm text-blue-700 dark:text-blue-300">تحويل الخصومات لحالة "معلق" حتى يتم اعتمادها يدوياً</p>
            </div>
            <Switch
              checked={settings.requireDeductionReview}
              onCheckedChange={(checked) => setSettings({ ...settings, requireDeductionReview: checked })}
            />
          </div>

          {!isTieredActive && (
            <div className="space-y-4 p-5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 relative overflow-hidden group">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-red-500" />
                <h4 className="font-bold text-gray-900 dark:text-white">مضاعفات الخصم للتكرار</h4>
                <span className="text-[10px] text-gray-500 font-normal">(يعمل الآن بالدقيقة)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>المخالفة الأولى</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.firstViolationMultiplier}
                    onChange={(e) => setSettings({ ...settings, firstViolationMultiplier: parseFloat(e.target.value) || 1.0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>المخالفة الثانية</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.secondViolationMultiplier}
                    onChange={(e) => setSettings({ ...settings, secondViolationMultiplier: parseFloat(e.target.value) || 2.0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>المخالفة الثالثة+</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.thirdViolationMultiplier}
                    onChange={(e) => setSettings({ ...settings, thirdViolationMultiplier: parseFloat(e.target.value) || 3.0 })}
                  />
                </div>
              </div>
            </div>
          )}

          <div className={`space-y-4 p-5 border rounded-xl transition-all ${isTieredActive
              ? 'border-purple-200 dark:border-purple-900 bg-purple-50/30 dark:bg-purple-950/20 ring-1 ring-purple-500/10'
              : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50'
            }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-500" />
                <h4 className="font-bold text-gray-900 dark:text-white">جدول شرائح الخصم الثابت</h4>
                {isTieredActive && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] rounded-full font-bold border border-purple-200">
                    مفعّل (يلغي الخصم بالدقيقة)
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentTiers = JSON.parse(settings.delayPenaltyTiers || '[]');
                  const newTiers = [...currentTiers, { minMinutes: 15, deductionDays: 0.25 }].sort((a, b) => a.minMinutes - b.minMinutes);
                  setSettings({ ...settings, delayPenaltyTiers: JSON.stringify(newTiers) });
                }}
              >
                <Plus className="h-4 w-4 ml-1" />
                إضافة شريحة
              </Button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              إذا تم تحديد شرائح، سيتم تطبيق خصم الشريحة بدلاً من الخصم بالدقيقة. يتم اختيار الشريحة الأعلى التي تنطبق على مدة التأخير.
            </p>

            <div className="space-y-2">
              {(() => {
                try {
                  const tiers = JSON.parse(settings.delayPenaltyTiers || '[]');
                  if (tiers.length === 0) return <p className="text-center py-4 text-gray-400 italic">لا توجد شرائح مضافة حالياً (يتم استخدام الخصم بالدقيقة)</p>;

                  return tiers.map((tier: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                      <div className="flex-1">
                        <Label className="text-[10px]">تأخير يبدأ من (دقيقة)</Label>
                        <Input
                          type="number"
                          value={tier.minMinutes}
                          onChange={(e) => {
                            const newTiers = [...tiers];
                            newTiers[index].minMinutes = parseInt(e.target.value) || 0;
                            setSettings({ ...settings, delayPenaltyTiers: JSON.stringify(newTiers) });
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-[10px]">الخصم المطبق (أيام)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={tier.deductionDays}
                          onChange={(e) => {
                            const newTiers = [...tiers];
                            newTiers[index].deductionDays = parseFloat(e.target.value) || 0;
                            setSettings({ ...settings, delayPenaltyTiers: JSON.stringify(newTiers) });
                          }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mt-4 text-red-500"
                        onClick={() => {
                          const newTiers = tiers.filter((_: any, i: number) => i !== index);
                          setSettings({ ...settings, delayPenaltyTiers: JSON.stringify(newTiers) });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ));
                } catch (e) {
                  return null;
                }
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 3. Calculation Engine Settings ---
export const CalculationEngine: React.FC<SubSettingProps> = ({ settings, setSettings }) => {
  const minuteRate = settings.workingDaysPerMonth && settings.workingHoursPerDay
    ? (1 / settings.workingDaysPerMonth / settings.workingHoursPerDay / 60).toFixed(4)
    : '0.0000';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>أيام العمل في الشهر</Label>
          <Input
            type="number"
            value={settings.workingDaysPerMonth}
            onChange={(e) => setSettings({ ...settings, workingDaysPerMonth: parseInt(e.target.value) || 22 })}
          />
        </div>
        <div className="space-y-2">
          <Label>ساعات العمل في اليوم</Label>
          <Input
            type="number"
            value={settings.workingHoursPerDay}
            onChange={(e) => setSettings({ ...settings, workingHoursPerDay: parseInt(e.target.value) || 8 })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>طريقة حساب الخصم</Label>
          <Select
            value={settings.deductionCalculationMethod}
            onValueChange={(value) => setSettings({ ...settings, deductionCalculationMethod: value })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="minute">بالدقيقة (الأدق)</SelectItem>
              <SelectItem value="hourly">بالساعة</SelectItem>
              <SelectItem value="daily">باليوم</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-red-600 font-bold">سقف الخصم اليومي (أيام)</Label>
            <Tooltip content="أقصى عدد أيام يمكن خصمه في يوم واحد">
              <Info className="h-4 w-4 text-gray-400" />
            </Tooltip>
          </div>
          <Input
            type="number"
            step="0.1"
            value={settings.maxDailyDeductionDays}
            onChange={(e) => setSettings({ ...settings, maxDailyDeductionDays: parseFloat(e.target.value) || 1.0 })}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-orange-600 font-bold">معامل خصم الغياب (أيام)</Label>
            <Tooltip content="عدد الأيام التي يتم خصمها مقابل يوم غياب واحد (مثلاً: 2 يعني اليوم بيومين)">
              <Info className="h-4 w-4 text-gray-400" />
            </Tooltip>
          </div>
          <Input
            type="number"
            step="0.1"
            value={settings.absencePenaltyRate}
            onChange={(e) => setSettings({ ...settings, absencePenaltyRate: parseFloat(e.target.value) || 1.0 })}
          />
          <p className="text-xs text-gray-500 font-bold italic">حالياً: خصم {settings.absencePenaltyRate} يوم لكل يوم غياب</p>
        </div>
      </div>

      <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-xl">
        <div className="flex items-start gap-2 text-green-800 dark:text-green-200">
          <Calculator className="h-5 w-5 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold mb-1">معادلة الحساب الحالية:</p>
            <p className="font-mono">قيمة الدقيقة = الراتب × {minuteRate}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 4. Notification & Alerts ---
export const PunctualityNotifications: React.FC<SubSettingProps> = ({ settings, setSettings }) => (
  <div className="space-y-4 p-5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50">
    <div className="flex items-center gap-2">
      <Bell className="h-5 w-5 text-purple-500" />
      <h4 className="font-bold text-gray-900 dark:text-white">إشعارات الالتزام</h4>
    </div>
    <div className="grid grid-cols-1 gap-4">
      <div className="space-y-2">
        <Label>تنبيه الموظف عند استهلاك رصيد التسامح بنسبة (%)</Label>
        <Input
          type="number"
          value={settings.notifyAtPercentage}
          onChange={(e) => setSettings({ ...settings, notifyAtPercentage: parseInt(e.target.value) || 75 })}
        />
      </div>
      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border">
        <Label>إشعار عند كل خصم مالي</Label>
        <Switch checked={settings.notifyOnDeduction} onCheckedChange={(c) => setSettings({ ...settings, notifyOnDeduction: c })} />
      </div>
    </div>
  </div>
);
