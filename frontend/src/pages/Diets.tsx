import React, { useState, useEffect } from 'react';
import { useGym, API_BASE } from '../context/GymContext';
import { 
  UtensilsCrossed, Plus, Edit2, Trash2, Calendar, Search, Check, X, 
  ChevronRight, Library, ArrowRight, UserPlus, Info, Flame, Apple 
} from 'lucide-react';

interface FoodItem {
  food_name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface DietPlan {
  id: number;
  plan_name: string;
  goal: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fats: number;
  water_intake: number;
  trainer_notes: string;
  meals: string; // JSON
}

interface MemberSummary {
  member_id: string;
  full_name: string;
  mobile_number: string;
  diet_plan_name?: string;
}

const MEAL_SLOTS = ['Breakfast', 'Mid-Day Snack', 'Lunch', 'Evening Snack', 'Dinner'];

export const Diets: React.FC = () => {
  const [plans, setPlans] = useState<DietPlan[]>([]);
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Builder states
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingPlan, setEditingPlan] = useState<DietPlan | null>(null);
  
  const [planForm, setPlanForm] = useState({
    plan_name: '',
    goal: 'Muscle Building',
    calories: 2500,
    protein: 150,
    carbohydrates: 200,
    fats: 70,
    water_intake: 3.5,
    trainer_notes: ''
  });

  // Meals data state
  const [currentMealSlot, setCurrentMealSlot] = useState('Breakfast');
  const [mealsData, setMealsData] = useState<Record<string, FoodItem[]>>({
    Breakfast: [], 'Mid-Day Snack': [], Lunch: [], 'Evening Snack': [], Dinner: []
  });

  // Individual Food Item Form state
  const [showFoodForm, setShowFoodForm] = useState(false);
  const [editingFoodIdx, setEditingFoodIdx] = useState<number | null>(null);
  const [foodForm, setFoodForm] = useState<FoodItem>({
    food_name: '',
    quantity: '100g',
    calories: 150,
    protein: 10,
    carbs: 15,
    fats: 5
  });

  // Assign plan states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPlanForAssign, setSelectedPlanForAssign] = useState<DietPlan | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [assignForm, setAssignForm] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 60 days default
  });

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      // Fetch Plans
      const plansRes = await fetch(`${API_BASE}/diets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data);
      }

      // Fetch Members
      const membersRes = await fetch(`${API_BASE}/reports/members?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (membersRes.ok) {
        const mData = await membersRes.json();
        setMembers(mData.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, []);

  const handleOpenBuilder = (plan?: DietPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        plan_name: plan.plan_name,
        goal: plan.goal,
        calories: plan.calories,
        protein: plan.protein,
        carbohydrates: plan.carbohydrates,
        fats: plan.fats,
        water_intake: plan.water_intake,
        trainer_notes: plan.trainer_notes || ''
      });
      try {
        setMealsData(JSON.parse(plan.meals));
      } catch (err) {
        console.error("Failed to parse meals details", err);
      }
    } else {
      setEditingPlan(null);
      setPlanForm({
        plan_name: '',
        goal: 'Muscle Building',
        calories: 2500,
        protein: 150,
        carbohydrates: 200,
        fats: 70,
        water_intake: 3.5,
        trainer_notes: ''
      });
      setMealsData({
        Breakfast: [], 'Mid-Day Snack': [], Lunch: [], 'Evening Snack': [], Dinner: []
      });
    }
    setCurrentMealSlot('Breakfast');
    setShowBuilder(true);
  };

  const handleFoodAddOrEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodForm.food_name) return;

    const slotFoods = [...mealsData[currentMealSlot]];
    if (editingFoodIdx !== null) {
      slotFoods[editingFoodIdx] = { ...foodForm };
    } else {
      slotFoods.push({ ...foodForm });
    }

    setMealsData({
      ...mealsData,
      [currentMealSlot]: slotFoods
    });

    setShowFoodForm(false);
    setEditingFoodIdx(null);
    setFoodForm({
      food_name: '',
      quantity: '100g',
      calories: 150,
      protein: 10,
      carbs: 15,
      fats: 5
    });
  };

  const handleEditFood = (idx: number) => {
    setEditingFoodIdx(idx);
    setFoodForm({ ...mealsData[currentMealSlot][idx] });
    setShowFoodForm(true);
  };

  const handleDeleteFood = (idx: number) => {
    const slotFoods = mealsData[currentMealSlot].filter((_, i) => i !== idx);
    setMealsData({
      ...mealsData,
      [currentMealSlot]: slotFoods
    });
  };

  const handleBuilderSubmit = async () => {
    if (!planForm.plan_name.trim()) {
      alert('Plan Name is required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingPlan ? `${API_BASE}/diets/${editingPlan.id}` : `${API_BASE}/diets`;
      const method = editingPlan ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...planForm,
          meals: mealsData
        })
      });

      if (res.ok) {
        fetchData();
        setShowBuilder(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save diet template');
      }
    } catch (err) {
      alert('Error saving diet plan');
    }
  };

  const handleDeletePlan = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this diet template?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/diets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      alert('Error deleting diet template');
    }
  };

  // Assignment Modal
  const handleOpenAssignModal = (plan: DietPlan) => {
    setSelectedPlanForAssign(plan);
    setSelectedMemberIds([]);
    setShowAssignModal(true);
  };

  const handleToggleMemberSelect = (memberId: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId) 
        : [...prev, memberId]
    );
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForAssign || selectedMemberIds.length === 0) return;

    try {
      const token = localStorage.getItem('token');
      let successCount = 0;

      for (const memberId of selectedMemberIds) {
        const res = await fetch(`${API_BASE}/members/${memberId}/assign-diet`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            diet_plan_id: selectedPlanForAssign.id,
            start_date: assignForm.start_date,
            end_date: assignForm.end_date
          })
        });
        if (res.ok) successCount++;
      }

      alert(`Diet plan assigned successfully to ${successCount} member(s).`);
      fetchData();
      setShowAssignModal(false);
    } catch (err) {
      alert('Error assigning diet plan');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      {!showBuilder ? (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Diet & Nutrition Templates</h2>
            <p className="text-muted-foreground text-sm mt-1">Design daily macro targets, meal timing slots, and assign nutrition plans.</p>
          </div>
          
          <button 
            onClick={() => handleOpenBuilder()}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary/95 cursor-pointer animate-pulse"
          >
            <Plus className="w-4 h-4" />
            Create Diet Plan
          </button>
        </div>
      ) : (
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <span className="text-[10px] text-primary uppercase font-bold tracking-widest block">Diet Planner Dashboard</span>
            <h2 className="text-2xl font-black text-foreground/90">{editingPlan ? 'Edit Diet Template' : 'Configure New Diet Template'}</h2>
          </div>
          <button 
            onClick={() => setShowBuilder(false)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-xs font-bold border border-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
            Exit Planner
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : !showBuilder ? (
        /* Plan templates grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div key={plan.id} className="glass-card rounded-3xl p-6 border flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-250 relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-lg text-foreground/90 leading-tight">{plan.plan_name}</h3>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">{plan.calories} kcal • {plan.water_intake}L Water</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black border bg-primary/10 text-primary border-primary/20">
                    {plan.goal}
                  </span>
                </div>

                {/* Macros display grid */}
                <div className="grid grid-cols-3 gap-2 bg-black/5 dark:bg-white/2 p-3 rounded-2xl border border-white/5 text-center">
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-slate-400 font-bold uppercase block">Protein</span>
                    <span className="text-xs font-black text-foreground">{plan.protein}g</span>
                  </div>
                  <div className="space-y-0.5 border-x border-white/10">
                    <span className="text-[8px] text-slate-400 font-bold uppercase block">Carbs</span>
                    <span className="text-xs font-black text-foreground">{plan.carbohydrates}g</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-slate-400 font-bold uppercase block">Fats</span>
                    <span className="text-xs font-black text-foreground">{plan.fats}g</span>
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground/80 line-clamp-3 italic">
                  {plan.trainer_notes ? `"${plan.trainer_notes}"` : 'No additional instruction notes provided.'}
                </div>
              </div>

              <div className="flex justify-between items-center mt-6 border-t border-black/5 dark:border-white/5 pt-4">
                <button
                  onClick={() => handleOpenAssignModal(plan)}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-[10px] font-black text-emerald-500 uppercase tracking-wider cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Assign
                </button>

                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenBuilder(plan)}
                    className="p-2 rounded-lg bg-black/5 dark:hover:bg-white/10 hover:bg-black/10 dark:bg-white/5 border border-white/10 text-foreground/80 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => handleDeletePlan(plan.id)}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {plans.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No diet templates created yet. Click "Create Diet Plan" to begin setting macros.
            </div>
          )}
        </div>
      ) : (
        /* Planner configuration layout */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Form Parameters & Macros Config */}
          <div className="space-y-6">
            <div className="glass-card rounded-3xl p-6 border space-y-4">
              <h3 className="font-extrabold text-sm border-b pb-3 mb-2 flex items-center gap-2">
                <Flame className="w-4 h-4 text-primary" />
                Diet Metadata
              </h3>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Diet Template Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Lean Bulk Caloric Plan"
                    value={planForm.plan_name}
                    onChange={(e) => setPlanForm({ ...planForm, plan_name: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Goal Category *</label>
                  <select
                    value={planForm.goal}
                    onChange={(e) => setPlanForm({ ...planForm, goal: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl glass-input text-xs appearance-none cursor-pointer border-white/10"
                  >
                    <option value="Weight Loss">Weight Loss</option>
                    <option value="Weight Gain">Weight Gain</option>
                    <option value="Muscle Building">Muscle Building</option>
                    <option value="Fat Loss">Fat Loss</option>
                    <option value="Strength">Strength</option>
                    <option value="General Fitness">General Fitness</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Calories (kcal) *</label>
                    <input
                      type="number"
                      value={planForm.calories}
                      onChange={(e) => setPlanForm({ ...planForm, calories: parseInt(e.target.value) || 2000 })}
                      className="w-full h-11 px-4 rounded-xl glass-input text-xs font-bold text-primary"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Water (Liters) *</label>
                    <input
                      type="number"
                      step="0.1"
                      value={planForm.water_intake}
                      onChange={(e) => setPlanForm({ ...planForm, water_intake: parseFloat(e.target.value) || 3.0 })}
                      className="w-full h-11 px-4 rounded-xl glass-input text-xs font-bold text-primary"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Target Macronutrients */}
            <div className="glass-card rounded-3xl p-6 border space-y-4">
              <h3 className="font-extrabold text-sm border-b pb-3 mb-2 flex items-center gap-2">
                <Apple className="w-4 h-4 text-primary" />
                Macronutrients Target
              </h3>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide text-center block">Protein (g)</label>
                  <input
                    type="number"
                    value={planForm.protein}
                    onChange={(e) => setPlanForm({ ...planForm, protein: parseInt(e.target.value) || 100 })}
                    className="w-full h-11 px-3 rounded-xl glass-input text-xs font-bold text-center border-white/10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide text-center block">Carbs (g)</label>
                  <input
                    type="number"
                    value={planForm.carbohydrates}
                    onChange={(e) => setPlanForm({ ...planForm, carbohydrates: parseInt(e.target.value) || 100 })}
                    className="w-full h-11 px-3 rounded-xl glass-input text-xs font-bold text-center border-white/10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide text-center block">Fats (g)</label>
                  <input
                    type="number"
                    value={planForm.fats}
                    onChange={(e) => setPlanForm({ ...planForm, fats: parseInt(e.target.value) || 50 })}
                    className="w-full h-11 px-3 rounded-xl glass-input text-xs font-bold text-center border-white/10"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Trainer Instruction Notes</label>
                <textarea
                  placeholder="Avoid fried foods, take multi-vitamins in morning, sleep 8 hrs..."
                  value={planForm.trainer_notes}
                  onChange={(e) => setPlanForm({ ...planForm, trainer_notes: e.target.value })}
                  className="w-full min-h-[80px] p-3 rounded-xl glass-input text-xs"
                />
              </div>
            </div>
          </div>

          {/* Meals schedule & food slots editor */}
          <div className="lg:col-span-2 glass-card rounded-3xl p-6 border space-y-4">
            <h3 className="font-extrabold text-sm border-b pb-3 mb-2 flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-primary" />
              Meal Slots routine
            </h3>

            <div className="flex border-b border-white/10 pb-0.5 gap-2 overflow-x-auto">
              {MEAL_SLOTS.map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setCurrentMealSlot(slot)}
                  className={`px-4.5 py-2 text-xs font-bold border-b-2 transition-all duration-200 cursor-pointer ${
                    currentMealSlot === slot 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {slot} ({mealsData[slot]?.length || 0})
                </button>
              ))}
            </div>

            {/* Food items inside selected meal slot */}
            <div className="space-y-3 pt-2">
              {mealsData[currentMealSlot]?.map((food, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5 hover:bg-black/10 transition-colors">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-foreground/90">{food.food_name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Qty: {food.quantity} • Calories: {food.calories} kcal • P: {food.protein}g | C: {food.carbs}g | F: {food.fats}g
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditFood(idx)}
                      className="p-1.5 rounded hover:bg-white/10 text-foreground/65 hover:text-foreground cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteFood(idx)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-red-500/65 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {mealsData[currentMealSlot]?.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-xs">
                  No food logs loaded for {currentMealSlot} yet. Click "Add Food Log" to record meal items.
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setEditingFoodIdx(null);
                    setFoodForm({ food_name: '', quantity: '100g', calories: 150, protein: 10, carbs: 15, fats: 5 });
                    setShowFoodForm(true);
                  }}
                  className="inline-flex items-center gap-1 px-4.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Food Log
                </button>

                <button
                  onClick={handleBuilderSubmit}
                  className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Diet Template
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Food Item Add/Edit Modal */}
      {showFoodForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-card border rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-base">{editingFoodIdx !== null ? 'Edit Food Log' : 'Add Food Item'}</h3>
              <button onClick={() => setShowFoodForm(false)} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFoodAddOrEdit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Food / Beverage Item Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Rolled Oats with Milk"
                  value={foodForm.food_name}
                  onChange={(e) => setFoodForm({ ...foodForm, food_name: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Serving Quantity *</label>
                  <input
                    type="text"
                    placeholder="e.g. 2 scoops or 150g"
                    value={foodForm.quantity}
                    onChange={(e) => setFoodForm({ ...foodForm, quantity: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Calories (kcal) *</label>
                  <input
                    type="number"
                    value={foodForm.calories}
                    onChange={(e) => setFoodForm({ ...foodForm, calories: parseInt(e.target.value) || 0 })}
                    className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide text-center block">Protein (g)</label>
                  <input
                    type="number"
                    value={foodForm.protein}
                    onChange={(e) => setFoodForm({ ...foodForm, protein: parseInt(e.target.value) || 0 })}
                    className="w-full h-11 px-2 rounded-xl glass-input text-xs text-center border-white/10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide text-center block">Carbs (g)</label>
                  <input
                    type="number"
                    value={foodForm.carbs}
                    onChange={(e) => setFoodForm({ ...foodForm, carbs: parseInt(e.target.value) || 0 })}
                    className="w-full h-11 px-2 rounded-xl glass-input text-xs text-center border-white/10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide text-center block">Fats (g)</label>
                  <input
                    type="number"
                    value={foodForm.fats}
                    onChange={(e) => setFoodForm({ ...foodForm, fats: parseInt(e.target.value) || 0 })}
                    className="w-full h-11 px-2 rounded-xl glass-input text-xs text-center border-white/10"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowFoodForm(false)}
                  className="px-4 py-2.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {editingFoodIdx !== null ? 'Save Changes' : 'Add Food'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Diet Plan Modal */}
      {showAssignModal && selectedPlanForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg glass-card border rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-extrabold text-base">Assign Diet & Nutrition Plan</h3>
                <span className="text-[10px] text-primary uppercase font-bold tracking-wider block mt-0.5">{selectedPlanForAssign.plan_name}</span>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nutrition Start Date</label>
                  <input
                    type="date"
                    value={assignForm.start_date}
                    onChange={(e) => setAssignForm({ ...assignForm, start_date: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl glass-input text-xs font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nutrition End Expiry</label>
                  <input
                    type="date"
                    value={assignForm.end_date}
                    onChange={(e) => setAssignForm({ ...assignForm, end_date: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl glass-input text-xs font-bold"
                    required
                  />
                </div>
              </div>

              {/* Members Multiple Selection List */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Select Gym Client(s) ({selectedMemberIds.length} Selected)</label>
                <div className="max-h-56 overflow-y-auto border border-white/10 dark:border-white/5 rounded-2xl p-2.5 bg-black/5 dark:bg-white/2 space-y-1.5">
                  {members.map(m => {
                    const isChecked = selectedMemberIds.includes(m.member_id);
                    return (
                      <button
                        key={m.member_id}
                        type="button"
                        onClick={() => handleToggleMemberSelect(m.member_id)}
                        className={`w-full p-2.5 rounded-xl border text-left flex justify-between items-center transition-all duration-150 cursor-pointer ${
                          isChecked 
                            ? 'bg-primary/10 border-primary text-primary' 
                            : 'bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5 text-foreground/80'
                        }`}
                      >
                        <div>
                          <span className="font-bold block text-[11px]">{m.full_name}</span>
                          <span className="text-[9px] text-muted-foreground font-mono">ID: {m.member_id} {m.diet_plan_name ? `• Current: ${m.diet_plan_name}` : ''}</span>
                        </div>

                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isChecked ? 'bg-primary border-primary text-white' : 'border-white/20'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                        </div>
                      </button>
                    );
                  })}
                  {members.length === 0 && (
                    <span className="text-[10px] text-muted-foreground text-center block py-6">No members registered in database yet.</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedMemberIds.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-40"
                >
                  Confirm Assign Diet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
