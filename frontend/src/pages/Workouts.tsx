import React, { useState, useEffect } from 'react';
import { useGym, API_BASE } from '../context/GymContext';
import { useAuth } from '../context/AuthContext';
import { 
  Dumbbell, Plus, Edit2, Trash2, Calendar, Search, Check, X, 
  ChevronRight, Library, ArrowRight, UserPlus, Info 
} from 'lucide-react';

interface Exercise {
  exercise_name: string;
  sets: number;
  reps: string;
  weight: string;
  rest_time: string;
  instructions: string;
  notes: string;
}

interface WorkoutPlan {
  id: number;
  plan_name: string;
  goal: string;
  fitness_level: string;
  duration: string;
  schedule: string; // JSON
}

interface MemberSummary {
  member_id: string;
  full_name: string;
  mobile_number: string;
  workout_plan_name?: string;
}

// Prefilled library database for quick search & add
const EXERCISE_LIBRARY = [
  { name: 'Flat Bench Press', category: 'Chest' },
  { name: 'Incline Dumbbell Press', category: 'Chest' },
  { name: 'Cable Chest Flyes', category: 'Chest' },
  { name: 'Push-ups', category: 'Chest' },
  { name: 'Deadlift', category: 'Back' },
  { name: 'Lat Pulldown', category: 'Back' },
  { name: 'Bent Over Barbell Row', category: 'Back' },
  { name: 'Seated Cable Row', category: 'Back' },
  { name: 'Pull-ups', category: 'Back' },
  { name: 'Overhead Shoulder Press', category: 'Shoulders' },
  { name: 'Dumbbell Lateral Raise', category: 'Shoulders' },
  { name: 'Front Dumbbell Raise', category: 'Shoulders' },
  { name: 'Face Pulls', category: 'Shoulders' },
  { name: 'Barbell Bicep Curl', category: 'Biceps' },
  { name: 'Dumbbell Hammer Curl', category: 'Biceps' },
  { name: 'Concentration Curl', category: 'Biceps' },
  { name: 'Tricep Rope Pushdown', category: 'Triceps' },
  { name: 'Skull Crushers', category: 'Triceps' },
  { name: 'Overhead Tricep Extension', category: 'Triceps' },
  { name: 'Barbell Back Squat', category: 'Legs' },
  { name: 'Leg Press', category: 'Legs' },
  { name: 'Lying Leg Curl', category: 'Legs' },
  { name: 'Calf Raises', category: 'Legs' },
  { name: 'Hanging Leg Raises', category: 'Core' },
  { name: 'Abdominal Crunches', category: 'Core' },
  { name: 'Plank Hold', category: 'Core' },
  { name: 'Treadmill Running', category: 'Cardio' },
  { name: 'Stationary Cycling', category: 'Cardio' },
  { name: 'Elliptical Cross Trainer', category: 'Cardio' },
  { name: 'Burpees', category: 'Full Body' },
  { name: 'Kettlebell Swings', category: 'Full Body' }
];

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const Workouts: React.FC = () => {
  const { admin } = useAuth();
  
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Search library states
  const [libSearch, setLibSearch] = useState('');
  const [libCategory, setLibCategory] = useState('All');

  // Plan builder states
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);
  
  const [planForm, setPlanForm] = useState({
    plan_name: '',
    goal: 'Muscle Building',
    fitness_level: 'Intermediate',
    duration: '60 Days'
  });

  // Week schedule splits state
  const [currentDayTab, setCurrentDayTab] = useState('Monday');
  const [scheduleData, setScheduleData] = useState<Record<string, Exercise[]>>({
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
  });

  // Individual Exercise Form state (adding/editing exercise inside builder day)
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [editingExerciseIdx, setEditingExerciseIdx] = useState<number | null>(null);
  const [exerciseForm, setExerciseForm] = useState<Exercise>({
    exercise_name: '',
    sets: 3,
    reps: '12',
    weight: '',
    rest_time: '60s',
    instructions: '',
    notes: ''
  });

  // Assign plan states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPlanForAssign, setSelectedPlanForAssign] = useState<WorkoutPlan | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [assignForm, setAssignForm] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 60 days default
  });

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      // Fetch Plans
      const plansRes = await fetch(`${API_BASE}/workouts`, {
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

  const handleOpenBuilder = (plan?: WorkoutPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        plan_name: plan.plan_name,
        goal: plan.goal,
        fitness_level: plan.fitness_level,
        duration: plan.duration
      });
      try {
        setScheduleData(JSON.parse(plan.schedule));
      } catch (err) {
        console.error("Failed to parse splits schedule", err);
      }
    } else {
      setEditingPlan(null);
      setPlanForm({
        plan_name: '',
        goal: 'Muscle Building',
        fitness_level: 'Intermediate',
        duration: '60 Days'
      });
      setScheduleData({
        Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
      });
    }
    setCurrentDayTab('Monday');
    setShowBuilder(true);
  };

  const handleExerciseAddOrEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseForm.exercise_name) return;

    const dayExercises = [...scheduleData[currentDayTab]];
    if (editingExerciseIdx !== null) {
      dayExercises[editingExerciseIdx] = { ...exerciseForm };
    } else {
      dayExercises.push({ ...exerciseForm });
    }

    setScheduleData({
      ...scheduleData,
      [currentDayTab]: dayExercises
    });

    setShowExerciseForm(false);
    setEditingExerciseIdx(null);
    setExerciseForm({
      exercise_name: '',
      sets: 3,
      reps: '12',
      weight: '',
      rest_time: '60s',
      instructions: '',
      notes: ''
    });
  };

  const handleEditExercise = (idx: number) => {
    setEditingExerciseIdx(idx);
    setExerciseForm({ ...scheduleData[currentDayTab][idx] });
    setShowExerciseForm(true);
  };

  const handleDeleteExercise = (idx: number) => {
    const dayExercises = scheduleData[currentDayTab].filter((_, i) => i !== idx);
    setScheduleData({
      ...scheduleData,
      [currentDayTab]: dayExercises
    });
  };

  const handleAddFromLibrary = (libExerciseName: string) => {
    setExerciseForm({
      exercise_name: libExerciseName,
      sets: 3,
      reps: '12',
      weight: '',
      rest_time: '60s',
      instructions: '',
      notes: ''
    });
    setEditingExerciseIdx(null);
    setShowExerciseForm(true);
  };

  const handleBuilderSubmit = async () => {
    if (!planForm.plan_name.trim()) {
      alert('Plan Name is required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingPlan ? `${API_BASE}/workouts/${editingPlan.id}` : `${API_BASE}/workouts`;
      const method = editingPlan ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...planForm,
          schedule: scheduleData
        })
      });

      if (res.ok) {
        fetchData();
        setShowBuilder(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save workout split');
      }
    } catch (err) {
      alert('Error saving workout plan');
    }
  };

  const handleDeletePlan = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this workout plan?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/workouts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      alert('Error deleting workout split');
    }
  };

  // Assignment Modal
  const handleOpenAssignModal = (plan: WorkoutPlan) => {
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
        const res = await fetch(`${API_BASE}/members/${memberId}/assign-workout`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            workout_plan_id: selectedPlanForAssign.id,
            start_date: assignForm.start_date,
            end_date: assignForm.end_date
          })
        });
        if (res.ok) successCount++;
      }

      alert(`Workout plan assigned successfully to ${successCount} member(s).`);
      fetchData();
      setShowAssignModal(false);
    } catch (err) {
      alert('Error assigning workout plan');
    }
  };

  const filteredLibrary = EXERCISE_LIBRARY.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(libSearch.toLowerCase());
    const matchesCategory = libCategory === 'All' || e.category === libCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Title Header */}
      {!showBuilder ? (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Workout Splits Builder</h2>
            <p className="text-muted-foreground text-sm mt-1">Design daily muscle splits templates and assign routines to members.</p>
          </div>
          
          <button 
            onClick={() => handleOpenBuilder()}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary/95 cursor-pointer animate-pulse"
          >
            <Plus className="w-4 h-4" />
            Create Workout Plan
          </button>
        </div>
      ) : (
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <span className="text-[10px] text-primary uppercase font-bold tracking-widest block">Splits Editor Dashboard</span>
            <h2 className="text-2xl font-black text-foreground/90">{editingPlan ? 'Edit Workout split Template' : 'Configure New Workout Split'}</h2>
          </div>
          <button 
            onClick={() => setShowBuilder(false)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-xs font-bold border border-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
            Exit Builder
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
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">{plan.fitness_level} • {plan.duration}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black border bg-primary/10 text-primary border-primary/20">
                    {plan.goal}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground/85 border-t border-black/5 dark:border-white/5 pt-3 space-y-1">
                  <span className="font-bold text-foreground/70 uppercase text-[9px] tracking-wide block">Schedule Summary</span>
                  {WEEKDAYS.map(day => {
                    let dayExercises: Exercise[] = [];
                    try {
                      dayExercises = JSON.parse(plan.schedule)[day] || [];
                    } catch (e) {}
                    if (dayExercises.length === 0) return null;
                    return (
                      <div key={day} className="flex justify-between items-center text-[10px]">
                        <span className="font-bold">{day}:</span>
                        <span>{dayExercises.length} Exercises</span>
                      </div>
                    );
                  })}
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
              No workout split templates created yet. Click "Create Workout Plan" to start designing.
            </div>
          )}
        </div>
      ) : (
        /* Splits schedule builder interface */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Builder parameters & Day schedule view */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-3xl p-6 border space-y-4">
              <h3 className="font-extrabold text-sm border-b pb-3 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Template Specifications
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Workout Plan Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. 5-Day Hypertrophy Routine"
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

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Fitness Level *</label>
                  <select
                    value={planForm.fitness_level}
                    onChange={(e) => setPlanForm({ ...planForm, fitness_level: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl glass-input text-xs appearance-none cursor-pointer border-white/10"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Duration Split *</label>
                  <select
                    value={planForm.duration}
                    onChange={(e) => setPlanForm({ ...planForm, duration: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl glass-input text-xs appearance-none cursor-pointer border-white/10"
                  >
                    <option value="30 Days">30 Days</option>
                    <option value="60 Days">60 Days</option>
                    <option value="90 Days">90 Days</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Weekly Days Scheduler */}
            <div className="glass-card rounded-3xl p-6 border space-y-4">
              <div className="flex border-b border-white/10 pb-0.5 gap-2 overflow-x-auto">
                {WEEKDAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setCurrentDayTab(day)}
                    className={`px-3 py-2 text-xs font-bold border-b-2 transition-all duration-200 cursor-pointer ${
                      currentDayTab === day 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {day} ({scheduleData[day]?.length || 0})
                  </button>
                ))}
              </div>

              {/* Day Routine List */}
              <div className="space-y-3 pt-2">
                {scheduleData[currentDayTab]?.map((ex, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5 hover:bg-black/10 transition-colors">
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm text-foreground/90">{ex.exercise_name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {ex.sets} Sets • {ex.reps} Reps {ex.weight ? `• ${ex.weight}` : ''} {ex.rest_time ? `• Rest: ${ex.rest_time}` : ''}
                      </span>
                      {ex.instructions && <p className="text-[10px] text-slate-500 font-light mt-1 italic">"{ex.instructions}"</p>}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditExercise(idx)}
                        className="p-1.5 rounded hover:bg-white/10 text-foreground/60 hover:text-foreground cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteExercise(idx)}
                        className="p-1.5 rounded hover:bg-red-500/10 text-red-500/60 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {scheduleData[currentDayTab]?.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground text-xs">
                    No exercises added for {currentDayTab} yet. Search the library on the right or click "Custom Exercise" below to start.
                  </div>
                )}

                <div className="flex justify-between pt-4 border-t border-black/5 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingExerciseIdx(null);
                      setExerciseForm({ exercise_name: '', sets: 3, reps: '12', weight: '', rest_time: '60s', instructions: '', notes: '' });
                      setShowExerciseForm(true);
                    }}
                    className="inline-flex items-center gap-1 px-4.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Custom Exercise
                  </button>

                  <button
                    onClick={handleBuilderSubmit}
                    className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    Save splits Template
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Exercise Library panel */}
          <div className="glass-card rounded-3xl p-6 border space-y-4 h-[calc(100vh-120px)] overflow-y-auto">
            <h3 className="font-extrabold text-sm border-b pb-3 mb-2 flex items-center gap-2">
              <Library className="w-4 h-4 text-primary" />
              Exercise Library
            </h3>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search catalog by name..."
                value={libSearch}
                onChange={(e) => setLibSearch(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl glass-input text-xs"
              />

              <div className="flex flex-wrap gap-1.5">
                {['All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core', 'Cardio'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setLibCategory(cat)}
                    className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider cursor-pointer ${
                      libCategory === cat
                        ? 'bg-primary text-white border-primary'
                        : 'bg-black/5 dark:bg-white/5 text-foreground/75 border-white/5'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-black/5 dark:border-white/5">
              {filteredLibrary.map(ex => (
                <button
                  key={ex.name}
                  type="button"
                  onClick={() => handleAddFromLibrary(ex.name)}
                  className="w-full p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-primary/10 border border-transparent hover:border-primary/20 text-left flex justify-between items-center group transition-all duration-200 cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-xs text-foreground/90 block group-hover:text-primary transition-colors">{ex.name}</span>
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">{ex.category}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-foreground/40 group-hover:text-primary transition-colors group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Exercise Modal Form (Custom / Adding from Lib) */}
      {showExerciseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-card border rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-base">{editingExerciseIdx !== null ? 'Edit Exercise' : 'Add Exercise to Split'}</h3>
              <button onClick={() => setShowExerciseForm(false)} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExerciseAddOrEdit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Exercise Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Incline Bench Press"
                  value={exerciseForm.exercise_name}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, exercise_name: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sets Count *</label>
                  <input
                    type="number"
                    value={exerciseForm.sets}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, sets: parseInt(e.target.value) || 3 })}
                    className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Reps Range *</label>
                  <input
                    type="text"
                    placeholder="e.g. 10-12 or Failure"
                    value={exerciseForm.reps}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, reps: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Weight Target</label>
                  <input
                    type="text"
                    placeholder="e.g. 60kg or Barbell"
                    value={exerciseForm.weight}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, weight: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Rest Interval</label>
                  <input
                    type="text"
                    placeholder="e.g. 60s or 2 mins"
                    value={exerciseForm.rest_time}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, rest_time: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl glass-input text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Form Instructions</label>
                <textarea
                  placeholder="Keep elbows tucked, lower bar to mid chest level slowly..."
                  value={exerciseForm.instructions}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, instructions: e.target.value })}
                  className="w-full min-h-[60px] p-3 rounded-xl glass-input text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowExerciseForm(false)}
                  className="px-4 py-2.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {editingExerciseIdx !== null ? 'Save Changes' : 'Add Exercise'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Workout Split Template Modal */}
      {showAssignModal && selectedPlanForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg glass-card border rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-extrabold text-base">Assign Workout Split Template</h3>
                <span className="text-[10px] text-primary uppercase font-bold tracking-wider block mt-0.5">{selectedPlanForAssign.plan_name}</span>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Routines Start Date</label>
                  <input
                    type="date"
                    value={assignForm.start_date}
                    onChange={(e) => setAssignForm({ ...assignForm, start_date: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl glass-input text-xs font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Routines End Expiry</label>
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
                          <span className="text-[9px] text-muted-foreground font-mono">ID: {m.member_id} {m.workout_plan_name ? `• Current: ${m.workout_plan_name}` : ''}</span>
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
                  Confirm Assign Split
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
