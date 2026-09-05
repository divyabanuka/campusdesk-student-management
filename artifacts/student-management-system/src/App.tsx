import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  ArrowRight,
  BookOpen,
  Check,
  ClipboardList,
  Edit3,
  Mail,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

type Student = {
  id: string;
  name: string;
  rollNumber: string;
  department: string;
  email: string;
  phone: string;
};

type StudentForm = Omit<Student, 'id'>;
type FormErrors = Partial<Record<keyof StudentForm, string>>;

const STORAGE_KEY = 'campus-records-students';
const queryClient = new QueryClient();
const emptyForm: StudentForm = {
  name: '',
  rollNumber: '',
  department: '',
  email: '',
  phone: '',
};

const departmentOptions = [
  'Computer Science',
  'Business Administration',
  'Engineering',
  'Arts & Humanities',
  'Natural Sciences',
  'Education',
  'Health Sciences',
];

function readStudents(): Student[] {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is Student => {
      if (!entry || typeof entry !== 'object') return false;
      const record = entry as Record<string, unknown>;
      return ['id', 'name', 'rollNumber', 'department', 'email', 'phone'].every(
        (key) => typeof record[key] === 'string',
      );
    });
  } catch {
    return [];
  }
}

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function validateForm(form: StudentForm, existing: Student[], editingId: string | null): FormErrors {
  const errors: FormErrors = {};
  const name = form.name.trim();
  const rollNumber = form.rollNumber.trim();
  const email = form.email.trim();
  const phoneDigits = form.phone.replace(/\D/g, '');

  if (!name) errors.name = 'Student name is required.';
  else if (name.length < 2) errors.name = 'Enter at least 2 characters.';
  if (!rollNumber) errors.rollNumber = 'Roll number is required.';
  else if (!/^[a-z0-9][a-z0-9 -]{1,19}$/i.test(rollNumber)) errors.rollNumber = 'Use 2–20 letters or numbers.';
  else if (existing.some((student) => student.rollNumber.toLowerCase() === rollNumber.toLowerCase() && student.id !== editingId)) {
    errors.rollNumber = 'This roll number is already in use.';
  }
  if (!form.department) errors.department = 'Choose a department.';
  if (!email) errors.email = 'Email address is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
  if (!form.phone.trim()) errors.phone = 'Phone number is required.';
  else if (phoneDigits.length < 7 || phoneDigits.length > 15) errors.phone = 'Enter a valid phone number.';
  return errors;
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function Home() {
  const [, setLocation] = useLocation();
  const [students, setStudents] = useState<Student[]>(readStudents);
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  }, [students]);

  const filteredStudents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return students;
    return students.filter((student) =>
      Object.values(student).some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [query, students]);

  const departments = useMemo(
    () => new Set(students.map((student) => student.department)).size,
    [students],
  );

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const clearForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setErrors({});
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateForm(form, students, editingId);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const cleanForm = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim()]),
    ) as StudentForm;

    if (editingId) {
      setStudents((current) => current.map((student) => (
        student.id === editingId ? { ...student, ...cleanForm } : student
      )));
      notify('Student record updated.');
    } else {
      setStudents((current) => [{ id: makeId(), ...cleanForm }, ...current]);
      notify('Student added to the directory.');
    }
    clearForm();
  };

  const editStudent = (student: Student) => {
    setEditingId(student.id);
    setForm({
      name: student.name,
      rollNumber: student.rollNumber,
      department: student.department,
      email: student.email,
      phone: student.phone,
    });
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteStudent = (student: Student) => {
    if (!window.confirm(`Remove ${student.name} from the student directory?`)) return;
    setStudents((current) => current.filter((item) => item.id !== student.id));
    if (editingId === student.id) clearForm();
    notify('Student record removed.');
  };

  const clearAll = () => {
    if (!students.length) return;
    if (!window.confirm('Clear every student record? This cannot be undone.')) return;
    setStudents([]);
    clearForm();
    notify('All student records cleared.');
  };

  const updateField = (field: keyof StudentForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-row flex items-center gap-3">
          <div className="brand-mark" aria-hidden="true"><BookOpen size={20} strokeWidth={2.2} /></div>
          <div>
            <div className="font-serif text-[1.16rem] font-bold leading-none tracking-[-.02em]">Campus Desk</div>
            <div className="mt-1 text-[.67rem] font-semibold uppercase tracking-[.15em] opacity-65">Student records</div>
          </div>
        </div>

        <nav className="sidebar-nav mt-14">
          <p className="mb-3 px-3 text-[.66rem] font-bold uppercase tracking-[.16em] opacity-55">Workspace</p>
          <button
            type="button"
            className="nav-item flex w-full items-center gap-3 rounded-lg bg-[hsl(var(--sidebar-accent))] px-3 py-3 text-left text-sm font-semibold"
            data-testid="nav-students"
            onClick={() => setLocation('/')}
          >
            <UsersRound size={17} />
            Student directory
          </button>
        </nav>

        <div className="sidebar-footnote mt-auto border-t border-[hsl(var(--sidebar-border))] pt-5 text-xs leading-5 opacity-70">
          <div className="mb-2 flex items-center gap-2 font-semibold opacity-90"><ShieldCheck size={15} /> Stored on this device</div>
          Your records stay in this browser and are ready whenever you return.
        </div>
      </aside>

      <main className="main-content">
        <div className="content-width page-enter">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="mb-2 text-[.71rem] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Registrar workspace</p>
              <h1 className="font-serif text-[clamp(2rem,4vw,3.15rem)] font-bold leading-[1.02] tracking-[-.035em]">Student directory</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Keep student details orderly, accessible, and easy to update.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] px-3 py-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" aria-hidden="true" />
              Local records
            </div>
          </header>

          <section className="data-card mb-7 p-5 sm:p-7" aria-labelledby="student-form-title">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[hsl(var(--primary))]">
                  <ClipboardList size={17} />
                  <span className="text-[.68rem] font-bold uppercase tracking-[.16em]">Record details</span>
                </div>
                <h2 id="student-form-title" className="font-serif text-2xl font-bold tracking-[-.025em]">
                  {editingId ? 'Edit student record' : 'Add a student'}
                </h2>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  {editingId ? 'Make your changes, then save the updated record.' : 'Enter the details below to create a new record.'}
                </p>
              </div>
              {editingId && (
                <button type="button" className="icon-button" onClick={clearForm} aria-label="Cancel editing" data-testid="button-cancel-edit">
                  <X size={17} />
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="grid gap-x-5 gap-y-5 md:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="student-name">Student name <span className="required">*</span></label>
                  <input id="student-name" className={`field-input ${errors.name ? 'error' : ''}`} value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="e.g. Maya Thompson" autoComplete="name" data-testid="input-student-name" />
                  {errors.name && <p className="field-error" data-testid="error-student-name">{errors.name}</p>}
                </div>
                <div>
                  <label className="field-label" htmlFor="roll-number">Roll number <span className="required">*</span></label>
                  <input id="roll-number" className={`field-input ${errors.rollNumber ? 'error' : ''}`} value={form.rollNumber} onChange={(event) => updateField('rollNumber', event.target.value)} placeholder="e.g. CS-2048" data-testid="input-roll-number" />
                  {errors.rollNumber && <p className="field-error" data-testid="error-roll-number">{errors.rollNumber}</p>}
                </div>
                <div>
                  <label className="field-label" htmlFor="department">Department <span className="required">*</span></label>
                  <select id="department" className={`field-input ${errors.department ? 'error' : ''}`} value={form.department} onChange={(event) => updateField('department', event.target.value)} data-testid="select-department">
                    <option value="">Select a department</option>
                    {departmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}
                  </select>
                  {errors.department && <p className="field-error" data-testid="error-department">{errors.department}</p>}
                </div>
                <div>
                  <label className="field-label" htmlFor="email">Email address <span className="required">*</span></label>
                  <input id="email" type="email" className={`field-input ${errors.email ? 'error' : ''}`} value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="student@campus.edu" autoComplete="email" data-testid="input-email" />
                  {errors.email && <p className="field-error" data-testid="error-email">{errors.email}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="field-label" htmlFor="phone">Phone number <span className="required">*</span></label>
                  <input id="phone" type="tel" className={`field-input ${errors.phone ? 'error' : ''}`} value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="e.g. +1 415 555 0182" autoComplete="tel" data-testid="input-phone" />
                  {errors.phone && <p className="field-error" data-testid="error-phone">{errors.phone}</p>}
                </div>
              </div>
              <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-[hsl(var(--border))] pt-5">
                <button type="button" className="action-button quiet-button" onClick={clearForm} data-testid="button-clear-form">
                  {editingId ? 'Cancel' : 'Clear form'}
                </button>
                <button type="submit" className="action-button primary-button" data-testid="button-submit-student">
                  {editingId ? <><Check size={16} /> Save changes</> : <><Plus size={17} /> Add student</>}
                </button>
              </div>
            </form>
          </section>

          <section aria-labelledby="directory-title">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-3">
                  <h2 id="directory-title" className="font-serif text-[1.7rem] font-bold tracking-[-.025em]">All students</h2>
                  <span className="rounded-full bg-[hsl(var(--secondary))] px-2.5 py-1 text-[.7rem] font-bold text-[hsl(var(--primary))]" data-testid="text-student-count">{students.length}</span>
                </div>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  {students.length ? `${departments} department${departments === 1 ? '' : 's'} represented` : 'Your directory is ready for its first record'}
                </p>
              </div>
              <button type="button" className="action-button danger-button" onClick={clearAll} disabled={!students.length} data-testid="button-clear-all">
                <Trash2 size={15} /> Clear all
              </button>
            </div>

            <div className="data-card overflow-hidden">
              <div className="border-b border-[hsl(var(--border))] p-4 sm:p-5">
                <label className="relative block" htmlFor="student-search">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={17} />
                  <input id="student-search" type="search" className="field-input pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, roll number, department, or email" data-testid="input-search-students" />
                </label>
              </div>

              {students.length === 0 ? (
                <div className="p-4 sm:p-5">
                  <div className="empty-state">
                    <div className="empty-icon"><UsersRound size={22} /></div>
                    <h3 className="font-serif text-xl font-bold">No students yet</h3>
                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                      Start with one student record. Once added, you can search, edit, or remove it from this directory.
                    </p>
                    <button type="button" className="action-button primary-button mt-5" onClick={() => document.getElementById('student-name')?.focus()} data-testid="button-start-record">
                      Add your first student <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="empty-state m-4 sm:m-5">
                  <div className="empty-icon"><Search size={21} /></div>
                  <h3 className="font-serif text-xl font-bold">No matching students</h3>
                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Try a different name, roll number, or department.</p>
                  <button type="button" className="action-button quiet-button mt-5" onClick={() => setQuery('')} data-testid="button-clear-search">Clear search</button>
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="student-table">
                    <thead>
                      <tr>
                        <th scope="col">Student</th>
                        <th scope="col">Roll number</th>
                        <th scope="col">Department</th>
                        <th scope="col">Contact</th>
                        <th scope="col"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => (
                        <tr key={student.id} data-testid={`row-student-${student.id}`}>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="student-avatar" aria-hidden="true">{initials(student.name)}</div>
                              <div>
                                <div className="text-sm font-bold" data-testid={`text-student-name-${student.id}`}>{student.name}</div>
                                <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{student.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="text-sm font-semibold text-[hsl(var(--foreground)/.8)]">{student.rollNumber}</td>
                          <td><span className="inline-flex rounded-md bg-[hsl(var(--secondary))] px-2.5 py-1 text-xs font-semibold text-[hsl(var(--secondary-foreground))]">{student.department}</span></td>
                          <td>
                            <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]"><Phone size={13} /> {student.phone}</div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]"><Mail size={13} /> {student.email}</div>
                          </td>
                          <td>
                            <div className="flex justify-end gap-1">
                              <button type="button" className="icon-button" onClick={() => editStudent(student)} aria-label={`Edit ${student.name}`} data-testid={`button-edit-student-${student.id}`}><Edit3 size={16} /></button>
                              <button type="button" className="icon-button delete" onClick={() => deleteStudent(student)} aria-label={`Delete ${student.name}`} data-testid={`button-delete-student-${student.id}`}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <footer className="mt-8 flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            <ShieldCheck size={14} className="text-[hsl(var(--primary))]" />
            Changes are saved automatically to this browser.
            <UserRound size={14} className="ml-2 text-[hsl(var(--primary))]" />
            <span data-testid="text-visible-count">{filteredStudents.length} visible</span>
          </footer>
        </div>
      </main>

      {toast && <div className="toast-message" role="status" data-testid="status-toast">{toast}</div>}
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  return (
    <ErrorBoundary resetKey={location}>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;