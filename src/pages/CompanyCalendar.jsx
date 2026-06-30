import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { getStoredUser, isAdminUser } from '../utils/auth';

const CompanyCalendar = () => {
  const user = getStoredUser();
  const isAdmin = isAdminUser(user);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [companyEvents, setCompanyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ 
    title: '', 
    date: '', 
    time: '', 
    location: '', 
    type: 'Event', 
    description: '' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddEvent = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const rowData = [
        new Date().toLocaleString('en-IN'),
        newEvent.title,       // Column B (index 1)
        newEvent.date,        // Column C (index 2)
        newEvent.time,        // Column D (index 3)
        newEvent.location,    // Column E (index 4)
        newEvent.type,        // Column F (index 5)
        newEvent.description  // Column G (index 6)
      ];

      const formData = new URLSearchParams();
      formData.append('action', 'insert');
      formData.append('sheetName', 'CompanyCalendar');
      formData.append('rowData', JSON.stringify(rowData));

      const response = await fetch("https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec", {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Event added successfully");
        setShowAddModal(false);
        setNewEvent({ 
          title: '', 
          date: '', 
          time: '', 
          location: '', 
          type: 'Event', 
          description: '' 
        });
        fetchCalendarData();
      } else {
        toast.error("Failed to add event");
      }
    } catch (error) {
      toast.error("An error occurred while adding the event");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch calendar data from Google Sheets
  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const [calendarRes, enquiryRes] = await Promise.all([
        fetch(`${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=CompanyCalendar&action=fetch`)
          .then(res => res.ok ? res.json() : { success: false, data: [] })
          .catch(() => ({ success: false, data: [] })),
        fetch(`${"https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec"}?sheet=ENQUIRY&action=fetch`)
          .then(res => res.ok ? res.json() : { success: false, data: [] })
          .catch(() => ({ success: false, data: [] }))
      ]);

      let allEvents = [];

      // Process Calendar Events
      if (calendarRes.success && calendarRes.data && calendarRes.data.length > 0) {
        const rawData = calendarRes.data;
        const dataRows = rawData.length > 1 ? rawData.slice(1) : []; // skip header if exists
        
        const processedEvents = dataRows.map((row, index) => {
          let formattedDate = '';
          if (row[2]) { // Date is now Column C (index 2)
            const dateStr = row[2];
            if (dateStr.includes('-') && dateStr.split('-').length === 3) {
                formattedDate = dateStr; 
            } else {
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                  formattedDate = date.toISOString().split('T')[0];
                } else if (dateStr.includes('/')) {
                  const parts = dateStr.split('/');
                  if (parts.length === 3) {
                    formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                  }
                }
            }
          }
          return {
            id: `evt-${index}`,
            timestamp: row[0] || '',
            date: formattedDate,
            title: row[1] || 'Event', // Title is now Column B (index 1)
            time: row[3] || '',
            location: row[4] || '',
            type: row[5] || 'Event',
            description: row[6] || ''
          };
        }).filter(e => e.date && e.title);
        
        allEvents = [...allEvents, ...processedEvents];
      }

      // Process Birthdays
      if (enquiryRes.success && enquiryRes.data && enquiryRes.data.length > 6) {
        const enquiryRows = enquiryRes.data.slice(6);
        const todayYear = new Date().getFullYear();
        
        enquiryRows.forEach((row, index) => {
           const dobStr = row[7]; // DOB Column H
           if (dobStr) {
               let parsedDate = null;
               if (dobStr.includes('/')) {
                 const parts = dobStr.split('/');
                 if (parts.length === 3) {
                   parsedDate = new Date(parts[2], parseInt(parts[1])-1, parts[0]);
                 }
               } else {
                 parsedDate = new Date(dobStr);
               }
               
               if (parsedDate && !isNaN(parsedDate.getTime())) {
                   const bMonth = parsedDate.getMonth() + 1;
                   const bDay = parsedDate.getDate();
                   // Set birthday to current year so it shows on this year's calendar
                   const formattedDate = `${todayYear}-${String(bMonth).padStart(2, '0')}-${String(bDay).padStart(2, '0')}`;
                   
                   allEvents.push({
                      id: `bdy-${index}`,
                      title: `🎂 ${row[6] || 'Employee'}'s Birthday`,
                      date: formattedDate,
                      type: 'birthday',
                      time: 'All Day',
                      location: 'Office'
                   });
               }
           }
        });
      }

      setCompanyEvents(allEvents);

    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast.error(`Failed to load calendar data`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getEventsForDate = (day) => {
    if (!day) return [];
    const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return companyEvents.filter(event => event.date === dateString);
  };

  const getEventTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'meeting': return 'bg-blue-100 text-blue-800';
      case 'holiday': return 'bg-red-100 text-red-800';
      case 'training': return 'bg-green-100 text-green-800';
      case 'review': return 'bg-purple-100 text-purple-800';
      case 'event': return 'bg-amber-100 text-amber-800';
      case 'birthday': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const days = getDaysInMonth(currentDate);
  const today = new Date();
  const isToday = (day) => {
    return day &&
      currentDate.getFullYear() === today.getFullYear() &&
      currentDate.getMonth() === today.getMonth() &&
      day === today.getDate();
  };

  // Filter upcoming events (from today onwards)
  const upcomingEvents = companyEvents.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate >= new Date(today.setHours(0, 0, 0, 0));
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="space-y-6 page-content p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Company Calendar</h1>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium transition-colors shadow-sm"
          >
            <Plus size={16} className="mr-2" />
            Add Event
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner message="Loading calendar data..." minHeight="400px" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {months[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeek.map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                const events = getEventsForDate(day);
                return (
                  <div
                    key={index}
                    className={`min-h-[50px] p-1 border border-gray-100 cursor-pointer hover:bg-gray-50 ${isToday(day) ? 'bg-indigo-50 border-indigo-200' : ''
                      }`}
                    onClick={() => setSelectedDate(day)}
                  >
                    {day && (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className={`text-sm font-medium ${isToday(day) ? 'text-indigo-600 bg-indigo-50 w-8 h-8 rounded-full flex items-center justify-center' : 'text-gray-900'}`}>
                          {day}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Events Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Events */}
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <Calendar size={20} className="mr-2" />
                Upcoming Events
              </h3>
              <div className="space-y-3">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.slice(0, 5).map(event => (
                    <div key={event.id} className="border-l-4 border-indigo-500 pl-3 py-2">
                      <h4 className="font-medium text-gray-900">{event.title}</h4>
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <Clock size={14} className="mr-1" />
                        {new Date(event.date).toLocaleDateString()} at {event.time}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin size={14} className="mr-1" />
                        {event.location}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No upcoming events</p>
                )}
              </div>
            </div>

            {/* Event Types Legend */}
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Event Types</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded mr-2"></div>
                  <span className="text-sm text-gray-700">Meetings</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-100 border border-red-200 rounded mr-2"></div>
                  <span className="text-sm text-gray-700">Holidays</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-100 border border-green-200 rounded mr-2"></div>
                  <span className="text-sm text-gray-700">Training</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-purple-100 border border-purple-200 rounded mr-2"></div>
                  <span className="text-sm text-gray-700">Reviews</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-amber-100 border border-amber-200 rounded mr-2"></div>
                  <span className="text-sm text-gray-700">Events</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-pink-100 border border-pink-200 rounded mr-2"></div>
                  <span className="text-sm text-gray-700">Birthdays</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Selected Date Events Modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedDate(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-slate-800 mb-6">
              Events on {months[currentDate.getMonth()]} {selectedDate}
            </h3>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {getEventsForDate(selectedDate).length > 0 ? (
                getEventsForDate(selectedDate).map(event => (
                  <div key={event.id} className="border border-slate-100 bg-slate-50 rounded-xl p-4">
                    <h4 className="font-bold text-slate-900">{event.title}</h4>
                    {event.time && (
                      <div className="flex items-center text-sm text-slate-600 mt-2">
                        <Clock size={14} className="mr-2" />
                        {event.time}
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center text-sm text-slate-600 mt-1">
                        <MapPin size={14} className="mr-2" />
                        {event.location}
                      </div>
                    )}
                    {event.description && <p className="text-sm text-slate-700 mt-2">{event.description}</p>}
                    <span className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md mt-3 ${getEventTypeColor(event.type)}`}>
                      {event.type}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500 font-medium">No events scheduled for this date.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-6">Add New Event</h2>
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Event Date*</label>
                  <input 
                    type="date" 
                    required
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Event Time</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 10:00 AM or All Day"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Event Title*</label>
                <input 
                  type="text" 
                  required
                  placeholder="Enter event title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Location</label>
                  <input 
                    type="text" 
                    placeholder="Office, Zoom, etc."
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Event Type</label>
                  <select 
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-sm font-bold appearance-none cursor-pointer"
                  >
                    <option value="Meeting">Meeting</option>
                    <option value="Holiday">Holiday</option>
                    <option value="Training">Training</option>
                    <option value="Review">Review</option>
                    <option value="Event">Event</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                <textarea 
                  rows="3"
                  placeholder="Brief description of the event"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-sm font-semibold resize-none"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2.5 bg-slate-50 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all active:scale-95 border border-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Save Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyCalendar;