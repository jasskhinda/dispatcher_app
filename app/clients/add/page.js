'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AddClient() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const [user, setUser] = useState(null);
  const [clientType, setClientType] = useState(''); // 'individual' or 'facility'
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [facilities, setFacilities] = useState([]);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [accessibilityNeeds, setAccessibilityNeeds] = useState('');
  const [medicalRequirements, setMedicalRequirements] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Check auth status and load facilities when component mounts
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }
      
      setUser(session.user);
      
      // Check if user has dispatcher role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (error || !profile || profile.role !== 'dispatcher') {
        // Not a dispatcher, redirect to login
        supabase.auth.signOut();
        router.push('/login?error=Access%20denied');
        return;
      }
      
      // Load facilities for facility client type
      try {
        const { data: facilitiesData, error: facilitiesError } = await supabase
          .from('facilities')
          .select('*')
          .order('name', { ascending: true });
        
        if (!facilitiesError && facilitiesData) {
          setFacilities(facilitiesData);
        }
      } catch (err) {
        console.error('Error loading facilities:', err);
      }
    };
    
    checkAuth();
  }, [router, supabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (clientType === 'individual') {
        setError('Individual client creation is coming soon! Please use the booking app for now.');
        setLoading(false);
        return;
      }
      
      if (clientType === 'facility') {
        if (!selectedFacilityId) {
          setError('Please select a facility for this client.');
          setLoading(false);
          return;
        }
        
        // Validate required fields to match facility app
        if (!firstName.trim() || !lastName.trim() || !email.trim() || !phoneNumber.trim() || !address.trim()) {
          setError('Please fill in all required fields (First Name, Last Name, Email, Phone Number, and Address).');
          setLoading(false);
          return;
        }
        
        // Create facility managed client
        const { data, error } = await supabase
          .from('facility_managed_clients')
          .insert([
            {
              first_name: firstName,
              last_name: lastName,
              email: email,
              phone_number: phoneNumber,
              address: address,
              accessibility_needs: accessibilityNeeds,
              medical_requirements: medicalRequirements,
              emergency_contact: emergencyContact,
              notes: notes,
              facility_id: selectedFacilityId,
              created_at: new Date().toISOString()
            }
          ])
          .select()
          .single();
        
        if (error) {
          throw new Error(error.message || 'Failed to create facility client');
        }
        
        // Success!
        setSuccess('Facility client successfully created and assigned to the selected facility.');
        
        // Reset the form
        setClientType('');
        setSelectedFacilityId('');
        setEmail('');
        setFirstName('');
        setLastName('');
        setPhoneNumber('');
        setAddress('');
        setAccessibilityNeeds('');
        setMedicalRequirements('');
        setEmergencyContact('');
        setNotes('');
      }
      
    } catch (err) {
      console.error('Error creating client:', err);
      setError(err.message || 'An error occurred while creating the client');
    } finally {
      setLoading(false);
    }
  };

  // Show loading if not authenticated yet
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Add New Client</h1>
          <button
            onClick={() => router.push('/clients')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50 transition-colors"
          >
            Back to Clients
          </button>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-medium mb-6 text-gray-900">Add New Client</h2>
          
          {error && (
            <div className="mb-6 p-4 border-l-4 border-red-500 bg-red-50 text-red-700 rounded">
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 border-l-4 border-green-500 bg-green-50 text-green-700 rounded">
              <p>{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Type Selection */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-md font-medium mb-4 text-gray-900">Select Client Type</h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div 
                  onClick={() => setClientType('individual')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    clientType === 'individual' 
                      ? 'border-[#7bcfd0] bg-[#7bcfd0]/10' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="clientType"
                      value="individual"
                      checked={clientType === 'individual'}
                      onChange={(e) => setClientType(e.target.value)}
                      className="h-4 w-4 text-[#7bcfd0] focus:ring-[#7bcfd0] border-gray-300"
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">Individual Client</div>
                      <div className="text-sm text-gray-500">Direct booking client from booking app</div>
                    </div>
                  </div>
                </div>
                
                <div 
                  onClick={() => setClientType('facility')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    clientType === 'facility' 
                      ? 'border-[#7bcfd0] bg-[#7bcfd0]/10' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="clientType"
                      value="facility"
                      checked={clientType === 'facility'}
                      onChange={(e) => setClientType(e.target.value)}
                      className="h-4 w-4 text-[#7bcfd0] focus:ring-[#7bcfd0] border-gray-300"
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">Facility Client</div>
                      <div className="text-sm text-gray-500">Client managed by a facility</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Facility Selection for Facility Clients */}
            {clientType === 'facility' && (
              <div className="bg-[#7bcfd0]/10 p-4 rounded-md border border-[#7bcfd0]/30">
                <h3 className="text-md font-medium mb-4 text-gray-900">Select Facility</h3>
                <div>
                  <label htmlFor="facility" className="block text-sm font-medium mb-1 text-gray-900">Assign to Facility *</label>
                  <select
                    id="facility"
                    value={selectedFacilityId}
                    onChange={(e) => setSelectedFacilityId(e.target.value)}
                    required={clientType === 'facility'}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#7bcfd0] focus:border-transparent text-gray-900"
                  >
                    <option value="">Select a facility...</option>
                    {facilities.map((facility) => (
                      <option key={facility.id} value={facility.id}>
                        {facility.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            
            {/* Coming Soon Message for Individual Clients */}
            {clientType === 'individual' && (
              <div className="bg-[#7bcfd0]/10 p-4 rounded-md border border-[#7bcfd0]/30">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-[#7bcfd0] mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-md font-medium text-gray-900">COMING SOON</h3>
                    <p className="text-sm text-gray-700 mt-1">
                      Individual client creation from dispatcher app is coming soon. For now, clients can register directly through our booking app.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Personal Information - Only show if facility client type is selected */}
            {clientType === 'facility' && (
            <>
            <div className="bg-white p-4 rounded-md border border-gray-200">
              <h3 className="text-md font-medium mb-4 text-gray-900">Client Information</h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium mb-1 text-gray-900">First Name *</label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#7bcfd0] focus:border-transparent text-gray-900"
                  />
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium mb-1 text-gray-900">Last Name *</label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#7bcfd0] focus:border-transparent text-gray-900"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="email" className="block text-sm font-medium mb-1 text-gray-900">Email *</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#7bcfd0] focus:border-transparent text-gray-900"
                />
                <p className="text-xs text-[#7bcfd0] mt-1">Required to create client account and send login credentials</p>
              </div>

              <div className="mt-4">
                <label htmlFor="phoneNumber" className="block text-sm font-medium mb-1 text-gray-900">Phone Number *</label>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#7bcfd0] focus:border-transparent text-gray-900"
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-white p-4 rounded-md border border-gray-200">
              <h3 className="text-md font-medium mb-4 text-gray-900">Additional Information</h3>
              
              <div>
                <label htmlFor="address" className="block text-sm font-medium mb-1 text-gray-900">Address *</label>
                <textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#7bcfd0] focus:border-transparent text-gray-900"
                />
              </div>
              
              <div className="mt-4">
                <label htmlFor="accessibilityNeeds" className="block text-sm font-medium mb-1 text-gray-900">Accessibility Needs</label>
                <textarea
                  id="accessibilityNeeds"
                  value={accessibilityNeeds}
                  onChange={(e) => setAccessibilityNeeds(e.target.value)}
                  rows={2}
                  placeholder="Wheelchair, mobility aids, visual/hearing assistance, etc."
                  className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#7bcfd0] focus:border-transparent text-gray-900"
                />
              </div>
              
              <div className="mt-4">
                <label htmlFor="medicalRequirements" className="block text-sm font-medium mb-1 text-gray-900">Medical Requirements</label>
                <textarea
                  id="medicalRequirements"
                  value={medicalRequirements}
                  onChange={(e) => setMedicalRequirements(e.target.value)}
                  rows={2}
                  placeholder="Oxygen, medical equipment, allergies, medications, etc."
                  className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#7bcfd0] focus:border-transparent text-gray-900"
                />
              </div>
              
              <div className="mt-4">
                <label htmlFor="emergencyContact" className="block text-sm font-medium mb-1 text-gray-900">Emergency Contact</label>
                <input
                  id="emergencyContact"
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="Name and phone number"
                  className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#7bcfd0] focus:border-transparent text-gray-900"
                />
              </div>
              
              <div className="mt-4">
                <label htmlFor="notes" className="block text-sm font-medium mb-1 text-gray-900">Notes</label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Special needs, preferences, etc."
                  className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#7bcfd0] focus:border-transparent text-gray-900"
                />
              </div>
            </div>
            </>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push('/clients')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md mr-3 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !clientType || (clientType === 'facility' && !selectedFacilityId)}
                className="px-4 py-2 bg-[#7bcfd0] text-white rounded-md hover:bg-[#6bb8ba] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 
                 clientType === 'individual' ? 'Coming Soon' :
                 clientType === 'facility' ? 'Create Facility Client' :
                 'Select Client Type'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}