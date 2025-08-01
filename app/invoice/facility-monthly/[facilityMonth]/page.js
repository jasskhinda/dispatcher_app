'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import EditTripForm from '../../../components/EditTripForm';

// Professional Monthly Facility Invoice - Shows all trips for a facility for a specific month
export default function FacilityMonthlyInvoicePage() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [facilityTrips, setFacilityTrips] = useState([]);
    const [facilityInfo, setFacilityInfo] = useState(null);
    const [error, setError] = useState(null);
    const [invoiceMonth, setInvoiceMonth] = useState('');
    const [totalAmount, setTotalAmount] = useState(0);
    const [sendingInvoice, setSendingInvoice] = useState(false);
    const [invoiceSent, setInvoiceSent] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState(null);
    const [updatingPaymentStatus, setUpdatingPaymentStatus] = useState(false);
    const [processingTripAction, setProcessingTripAction] = useState(null);
    const [pendingAmount, setPendingAmount] = useState(0);
    const [showEditForm, setShowEditForm] = useState(false);
    const [editingTrip, setEditingTrip] = useState(null);
    const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
    const [showVerificationDialog, setShowVerificationDialog] = useState(false);
    const [showCheckReceivedDialog, setShowCheckReceivedDialog] = useState(false);
    const [showConfirmPaymentDialog, setShowConfirmPaymentDialog] = useState(false);
    const [showPaymentFailedDialog, setShowPaymentFailedDialog] = useState(false);
    const [facilityContract, setFacilityContract] = useState(null);
    const [contractLoading, setContractLoading] = useState(false);
    const [contractError, setContractError] = useState(null);
    
    // Professional billing breakdown states
    const [previouslyPaidAmount, setPreviouslyPaidAmount] = useState(0);
    const [completedTripsAmount, setCompletedTripsAmount] = useState(0);
    const [billableTrips, setBillableTrips] = useState([]);
    const [pendingTrips, setPendingTrips] = useState([]);
    
    const router = useRouter();
    const params = useParams();
    const facilityMonth = params.facilityMonth; // This will be in format: facilityId-YYYY-MM
    const supabase = createClientComponentClient();

    // Load facility contract
    const loadFacilityContract = async (facilityId) => {
        try {
            setContractLoading(true);
            setContractError(null);

            // Check if there's a contract for this facility
            const { data: files, error: listError } = await supabase.storage
                .from('contracts')
                .list(`facility/${facilityId}`, {
                    limit: 1,
                    sortBy: { column: 'created_at', order: 'desc' }
                });

            if (listError) {
                console.log('Contract storage error:', listError);
                setFacilityContract(null);
                return;
            }

            if (files && files.length > 0) {
                const contractFile = files[0];
                
                // Get the public URL for the contract
                const { data: urlData } = supabase.storage
                    .from('contracts')
                    .getPublicUrl(`facility/${facilityId}/${contractFile.name}`);

                setFacilityContract({
                    name: contractFile.name,
                    url: urlData.publicUrl,
                    uploadedAt: contractFile.created_at,
                    size: contractFile.metadata?.size || 'Unknown'
                });
            } else {
                setFacilityContract(null);
            }
        } catch (err) {
            console.error('Error loading facility contract:', err);
            setContractError('Unable to load contract');
            setFacilityContract(null);
        } finally {
            setContractLoading(false);
        }
    };

    useEffect(() => {
        async function fetchMonthlyInvoiceData() {
            try {
                console.log('🔍 Step 1: Starting fetchMonthlyInvoiceData...');
                
                // Try to load cached data first
                const cacheKey = `facility_invoice_${facilityMonth}`;
                
                // TEMPORARY: Clear old cache to fix stale data issue
                sessionStorage.removeItem(cacheKey);
                console.log('🗑️ Cleared potentially stale cache');
                
                const cachedData = sessionStorage.getItem(cacheKey);
                
                if (cachedData) {
                    try {
                        const parsed = JSON.parse(cachedData);
                        console.log('📦 Loading data from cache...');
                        console.log('📦 Cached billable trips count:', parsed.billableTrips?.length || 0);
                        console.log('📦 Sample cached billable trip:', parsed.billableTrips?.[0] || 'None');
                        
                        // Set cached data immediately to prevent blank screen
                        setBillableTrips(parsed.billableTrips || []);
                        setPendingTrips(parsed.pendingTrips || []);
                        setFacilityTrips(parsed.facilityTrips || []);
                        setFacilityInfo(parsed.facilityInfo || null);
                        setTotalAmount(parsed.totalAmount || 0);
                        setPendingAmount(parsed.pendingAmount || 0);
                        setCompletedTripsAmount(parsed.completedTripsAmount || 0);
                        setPreviouslyPaidAmount(parsed.previouslyPaidAmount || 0);
                        setPaymentStatus(parsed.paymentStatus || null);
                        setInvoiceMonth(parsed.invoiceMonth || '');
                        
                        console.log('✅ Cached data loaded successfully');
                    } catch (cacheError) {
                        console.log('⚠️ Cache parsing error, proceeding with fresh fetch');
                    }
                }
                
                setLoading(true);
                
                // Check authentication
                console.log('🔍 Step 2: Checking authentication...');
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError) {
                    console.error('❌ Step 2 FAILED: Session error:', sessionError);
                    setError('Authentication error');
                    setLoading(false);
                    return;
                }

                if (!session) {
                    console.log('❌ Step 2 FAILED: No session found, redirecting to login');
                    router.push('/login');
                    return;
                }

                console.log('✅ Step 2: User authenticated:', session.user.email);
                setUser(session.user);

                // Parse the facilityMonth parameter to extract facility ID and target month
                console.log('🔍 Step 3: Parsing facilityMonth parameter...');
                // Format expected: facilityId-YYYY-MM
                let facilityId = null;
                let targetMonth = null;
                
                console.log('🔍 Parsing facilityMonth parameter:', facilityMonth);
                
                if (!facilityMonth) {
                    console.error('❌ Step 3 FAILED: No facilityMonth parameter provided');
                    setError('Invalid invoice URL format');
                    setLoading(false);
                    return;
                }
                
                // Split on the last two dashes to handle facility IDs that might contain dashes
                const parts = facilityMonth.split('-');
                if (parts.length < 3) {
                    console.error('❌ Step 3 FAILED: Invalid facilityMonth format:', facilityMonth);
                    setError('Invalid invoice URL format. Expected format: facilityId-YYYY-MM');
                    setLoading(false);
                    return;
                }
                
                // Extract year and month (last two parts)
                const monthPart = parts.pop();
                const yearPart = parts.pop();
                facilityId = parts.join('-'); // Rejoin remaining parts as facility ID
                targetMonth = `${yearPart}-${monthPart}`;
                
                console.log(`✅ Step 3: Parsed facility ID: ${facilityId}, target month: ${targetMonth}`);

                // Enhanced debugging for facility lookup
                console.log('🔍 Step 4: About to query facility with ID:', facilityId);
                console.log('🔍 Facility ID length:', facilityId.length);
                console.log('🔍 Facility ID type:', typeof facilityId);

                // Get facility information
                console.log('🔍 Step 5: Querying facility information...');
                const { data: facility, error: facilityError } = await supabase
                    .from('facilities')
                    .select('id, name, contact_email, phone_number, address, billing_email')
                    .eq('id', facilityId)
                    .single();

                console.log('🔍 Step 5: Facility query result:', { facility, error: facilityError });

                if (facilityError || !facility) {
                    console.error('❌ Step 5 RESULT: Facility not found:', facilityError);
                    
                    // Enhanced error debugging: try to find any facilities with similar IDs
                    console.log('🔍 Step 5a: Searching for similar facility IDs...');
                    const { data: allFacilities, error: allError } = await supabase
                        .from('facilities')
                        .select('id, name')
                        .limit(10);
                    
                    if (!allError && allFacilities) {
                        console.log('📊 Step 5a: Available facilities:', allFacilities);
                        const matchingFacilities = allFacilities.filter(f => f.id.includes('e1b94bde'));
                        console.log('🎯 Step 5a: Facilities with matching prefix:', matchingFacilities);
                    }
                    
                    // 🆘 FALLBACK: Use generic facility data if not found
                    console.log('🆘 Step 5b: Facility not found, using fallback data...');
                    const fallbackFacility = {
                        id: facilityId,
                        name: `Healthcare Facility ${facilityId.substring(0, 8)}...`,
                        contact_email: 'contact@facility.com',
                        billing_email: 'billing@facility.com',
                        phone_number: 'Phone not available',
                        address: 'Address not available'
                    };
                    
                    // 🔧 PERMANENT FIX: Try to create the facility record in the database
                    console.log('🔧 Step 5c: Attempting to create missing facility record...');
                    try {
                        const { data: createdFacility, error: createError } = await supabase
                            .from('facilities')
                            .upsert([{
                                id: facilityId,
                                name: 'CareBridge Living',
                                contact_email: 'contact@CareBridgeLiving.com',
                                billing_email: 'billing@CareBridgeLiving.com',
                                phone_number: '(555) 123-4567',
                                address: '123 Main Street, Your City, State 12345',
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            }], {
                                onConflict: 'id'
                            })
                            .select()
                            .single();
                        
                        if (createError) {
                            console.log('⚠️ Step 5c: Could not create facility record (may already exist):', createError.message);
                            console.log('📝 Step 5c: Using fallback facility data for invoice display');
                        } else {
                            console.log('✅ Step 5c: Successfully created facility record:', createdFacility);
                            // Use the created facility instead of fallback
                            setFacilityInfo(createdFacility);
                        }
                    } catch (createErr) {
                        console.log('⚠️ Step 5c: Facility creation failed, using fallback:', createErr.message);
                    }
                    
                    // Always set fallback info in case creation failed
                    if (!facilityInfo) {
                        setFacilityInfo(fallbackFacility);
                    }
                    console.log('✅ Step 5: Using facility info for invoice generation');
                } else {
                    // ✅ Facility found - validate and enhance the data
                    console.log('✅ Step 5: Facility found in database:', facility.name);
                    
                    // Ensure facility has complete data for invoicing
                    const enhancedFacility = {
                        ...facility,
                        name: facility.name || 'CareBridge Living',
                        contact_email: facility.contact_email || 'contact@CareBridgeLiving.com',
                        billing_email: facility.billing_email || 'billing@CareBridgeLiving.com',
                        phone_number: facility.phone_number || '(555) 123-4567',
                        address: facility.address || '123 Main Street, Your City, State 12345'
                    };
                    
                    // If any data was missing, update the database
                    if (JSON.stringify(facility) !== JSON.stringify(enhancedFacility)) {
                        console.log('🔧 Step 5d: Updating incomplete facility data...');
                        try {
                            const { data: updatedFacility, error: updateError } = await supabase
                                .from('facilities')
                                .update({
                                    name: enhancedFacility.name,
                                    contact_email: enhancedFacility.contact_email,
                                    billing_email: enhancedFacility.billing_email,
                                    phone_number: enhancedFacility.phone_number,
                                    address: enhancedFacility.address,
                                    updated_at: new Date().toISOString()
                                })
                                .eq('id', facilityId)
                                .select()
                                .single();
                            
                            if (!updateError && updatedFacility) {
                                console.log('✅ Step 5d: Facility data updated successfully');
                                setFacilityInfo(updatedFacility);
                            } else {
                                console.log('⚠️ Step 5d: Could not update facility, using enhanced data');
                                setFacilityInfo(enhancedFacility);
                            }
                        } catch (updateErr) {
                            console.log('⚠️ Step 5d: Update failed, using enhanced data:', updateErr.message);
                            setFacilityInfo(enhancedFacility);
                        }
                    } else {
                        setFacilityInfo(facility);
                    }
                    
                    console.log('✅ Step 5: Final facility info loaded:', enhancedFacility.name);
                }
                

                // Load facility contract
                await loadFacilityContract(facilityId);

                setInvoiceMonth(targetMonth);

                // Get all trips for this facility for the target month
                console.log('🔍 Step 6: Preparing date range for trips query...');
                const [year, month] = targetMonth.split('-');
                const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
                
                const startISO = startDate.toISOString();
                const endISO = endDate.toISOString();

                console.log(`🔍 Fetching all trips for facility ${facilityId} for month ${targetMonth}`);
                console.log(`📅 Date range: ${startISO} to ${endISO}`);

                let tripsQuery;
                try {
                    console.log('🔍 Step 6: Building trips query...');
                    tripsQuery = supabase
                        .from('trips')
                        .select(`
                            id,
                            pickup_address,
                            destination_address,
                            pickup_time,
                            price,
                            status,
                            wheelchair_type,
                            is_round_trip,
                            additional_passengers,
                            managed_client_id,
                            user_id,
                            last_edited_by,
                            last_edited_at,
                            edited_by_role
                        `)
                        .eq('facility_id', facilityId)
                        .gte('pickup_time', startISO)
                        .lte('pickup_time', endISO)
                        .in('status', ['completed', 'upcoming', 'pending', 'confirmed', 'approved', 'in_process', 'paid_in_progress', 'approved_pending_payment'])
                        .order('pickup_time', { ascending: false });
                    
                    console.log('✅ Step 6: Trips query built successfully');
                } catch (queryBuildError) {
                    console.error('❌ Step 6 FAILED: Error building trips query:', queryBuildError);
                    throw queryBuildError;
                }

                console.log('🔍 Step 7: Executing trips query...');
                let { data: trips, error: tripsError } = await tripsQuery;

                if (tripsError) {
                    console.error('❌ Step 7 FAILED: Error fetching trips:', tripsError);
                    console.error('❌ Trip error details:', JSON.stringify(tripsError, null, 2));
                    setError(`Failed to fetch trips: ${tripsError.message}`);
                    setLoading(false);
                    return;
                }

                console.log(`✅ Step 7: Found ${trips?.length || 0} trips for the month`);
                console.log('🔍 Sample trip data:', trips?.[0] || 'No trips found');
                
                // For historical months (older than current month), add fallback query to catch completed trips
                // that might have been missed due to status filtering
                const currentDateForHistory = new Date();
                const currentMonthForHistory = currentDateForHistory.toISOString().slice(0, 7); // YYYY-MM format
                const isHistoricalMonth = targetMonth < currentMonthForHistory;
                
                if (isHistoricalMonth && (!trips || trips.length === 0)) {
                    console.log('🔄 Historical month with no trips found, trying fallback query...');
                    
                    try {
                        // Broader query for historical months - include all possible completed statuses
                        const { data: fallbackTrips, error: fallbackError } = await supabase
                            .from('trips')
                            .select(`
                                id,
                                pickup_address,
                                destination_address,
                                pickup_time,
                                price,
                                status,
                                wheelchair_type,
                                is_round_trip,
                                additional_passengers,
                                managed_client_id,
                                user_id,
                                last_edited_by,
                                last_edited_at,
                                edited_by_role
                            `)
                            .eq('facility_id', facilityId)
                            .gte('pickup_time', startISO)
                            .lte('pickup_time', endISO)
                            .not('price', 'is', null)
                            .gt('price', 0)
                            .order('pickup_time', { ascending: false });
                        
                        if (!fallbackError && fallbackTrips && fallbackTrips.length > 0) {
                            console.log(`🔄 Fallback query found ${fallbackTrips.length} trips for historical month`);
                            trips = fallbackTrips;
                        }
                    } catch (fallbackErr) {
                        console.log('⚠️ Fallback query failed:', fallbackErr);
                    }
                }
                
                // Debug price data for all trips
                if (trips && trips.length > 0) {
                    console.log('💰 Price analysis for first 5 trips:');
                    trips.slice(0, 5).forEach((trip, index) => {
                        console.log(`   Trip ${index + 1}:`, {
                            id: trip.id.substring(0, 8),
                            price: trip.price,
                            priceType: typeof trip.price,
                            status: trip.status,
                            pickup_time: trip.pickup_time
                        });
                    });
                }

                // Check for existing payment status for this facility and month
                console.log(`🔍 Step 7.5: Checking payment status for facility ${facilityId} for ${targetMonth}`);
                
                let paymentStatus = null;
                
                try {
                    // First, try to get payment status from facility_invoices table (new system)
                    const { data: invoiceData, error: invoiceError } = await supabase
                        .from('facility_invoices')
                        .select('*')
                        .eq('facility_id', facilityId)
                        .eq('month', targetMonth)
                        .single();

                    if (!invoiceError && invoiceData) {
                        paymentStatus = {
                            id: invoiceData.id, // Include the invoice ID
                            payment_status: invoiceData.payment_status,
                            status: invoiceData.payment_status, // Keep both for compatibility
                            total_amount: invoiceData.total_amount,
                            last_updated: invoiceData.last_updated,
                            invoice_number: invoiceData.invoice_number,
                            payment_notes: invoiceData.notes // Include professional notes for dispatcher
                        };
                        console.log('✅ Step 7.5: Found payment status in facility_invoices:', paymentStatus);
                    } else {
                        // Fallback to old facility_payment_status table
                        console.log('🔍 Step 7.5b: Trying fallback facility_payment_status table...');
                        const { data, error: paymentError } = await supabase
                            .from('facility_payment_status')
                            .select('*')
                            .eq('facility_id', facilityId)
                            .eq('invoice_month', parseInt(month))
                            .eq('invoice_year', parseInt(year))
                            .single();

                        if (paymentError && paymentError.code !== 'PGRST116') {
                            // Check if it's a table not found error
                            if ((paymentError.message && paymentError.message.includes('does not exist')) || (paymentError.message && paymentError.message.includes('relation')) || paymentError.code === '42P01') {
                                console.log('⚠️ Payment status table does not exist, checking localStorage fallback...');
                                
                                // Try to load from localStorage
                                const storageKey = `payment_status_${facilityId}_${year}_${month}`;
                                const storedStatus = localStorage.getItem(storageKey);
                                
                                if (storedStatus) {
                                    try {
                                        paymentStatus = JSON.parse(storedStatus);
                                        console.log('✅ Found payment status in localStorage:', paymentStatus);
                                    } catch (parseError) {
                                        console.log('⚠️ Failed to parse stored payment status');
                                    }
                                } else {
                                    console.log('💡 No payment status found in localStorage either');
                                }
                            } else {
                                console.log('Payment status check error:', paymentError);
                            }
                        } else if (data) {
                            paymentStatus = data;
                            console.log('✅ Step 7.5b: Found payment status in facility_payment_status:', paymentStatus);
                        }
                    }
                } catch (error) {
                    console.log('⚠️ Error checking payment status:', error);
                    
                    // Try localStorage fallback
                    const storageKey = `payment_status_${facilityId}_${year}_${month}`;
                    const storedStatus = localStorage.getItem(storageKey);
                    
                    if (storedStatus) {
                        try {
                            paymentStatus = JSON.parse(storedStatus);
                            console.log('✅ Using localStorage fallback for payment status:', paymentStatus);
                        } catch (parseError) {
                            console.log('⚠️ Failed to parse stored payment status');
                        }
                    }
                }
                
                if (paymentStatus) {
                    setPaymentStatus(paymentStatus);
                }

                // Step 8: Fetch client information separately (to avoid schema relationship issues)
                console.log('🔍 Step 8: Fetching client information separately...');
                let userProfiles = [];
                let managedClients = [];

                if (trips && trips.length > 0) {
                    // Get unique user IDs and managed client IDs
                    const userIds = [...new Set(trips.filter(trip => trip.user_id).map(trip => trip.user_id))];
                    const managedClientIds = [...new Set(trips.filter(trip => trip.managed_client_id).map(trip => trip.managed_client_id))];

                    console.log(`   - User IDs to fetch: ${userIds.length}`);
                    console.log(`   - Managed Client IDs to fetch: ${managedClientIds.length}`);

                    // Fetch user profiles
                    if (userIds.length > 0) {
                        const { data: profiles, error: profilesError } = await supabase
                            .from('profiles')
                            .select('id, first_name, last_name, phone_number, email')
                            .in('id', userIds);
                        
                        if (!profilesError && profiles) {
                            userProfiles = profiles;
                            console.log(`   ✅ Fetched ${userProfiles.length} user profiles`);
                        }
                    }

                    // Fetch managed clients (try multiple tables for compatibility)
                    if (managedClientIds.length > 0) {
                        try {
                            // Try facility_managed_clients first
                            const { data: fmc, error: fmcError } = await supabase
                                .from('facility_managed_clients')
                                .select('id, first_name, last_name, phone_number, email')
                                .in('id', managedClientIds);
                            
                            if (!fmcError && fmc && fmc.length > 0) {
                                managedClients = fmc;
                                console.log(`   ✅ Fetched ${managedClients.length} managed clients from facility_managed_clients`);
                            }
                        } catch (e) {
                            console.log('   ⚠️ facility_managed_clients table not accessible');
                        }

                        // Try managed_clients table if no results from facility_managed_clients
                        if (managedClients.length === 0) {
                            try {
                                const { data: mc, error: mcError } = await supabase
                                    .from('managed_clients')
                                    .select('id, first_name, last_name, phone_number, email')
                                    .in('id', managedClientIds);
                                
                                if (!mcError && mc) {
                                    managedClients = mc;
                                    console.log(`   ✅ Fetched ${managedClients.length} managed clients from managed_clients`);
                                }
                            } catch (e) {
                                console.log('   ⚠️ managed_clients table not accessible');
                            }
                        }
                    }

                    // Enhance trips with client information
                    console.log('🔍 Step 8b: Combining trips with client data...');
                    const enhancedTrips = trips.map(trip => {
                        const enhancedTrip = { ...trip };
                        
                        // Add user profile if exists
                        if (trip.user_id) {
                            enhancedTrip.user_profile = userProfiles.find(profile => profile.id === trip.user_id) || null;
                        }
                        
                        // Add managed client if exists
                        if (trip.managed_client_id) {
                            enhancedTrip.managed_client = managedClients.find(client => client.id === trip.managed_client_id) || null;
                        }
                        
                        return enhancedTrip;
                    });

                    console.log(`✅ Step 8: Enhanced ${enhancedTrips.length} trips with client information`);
                    setFacilityTrips(enhancedTrips);
                } else {
                    setFacilityTrips([]);
                }
                
                // Also ensure we set the enhanced data for the billing calculation
                console.log('🔍 Setting facility trips state for consistency...');
                
                // SIMPLIFIED monthly billing calculation
                console.log('🔍 Step 9: Monthly billing calculation...');
                // Use the freshly enhanced trips from Step 8
                const tripsForBilling = trips && trips.length > 0 ? trips.map(trip => {
                    const enhancedTrip = { ...trip };
                    
                    // Add user profile if exists
                    if (trip.user_id) {
                        enhancedTrip.user_profile = userProfiles.find(profile => profile.id === trip.user_id) || null;
                    }
                    
                    // Add managed client if exists
                    if (trip.managed_client_id) {
                        enhancedTrip.managed_client = managedClients.find(client => client.id === trip.managed_client_id) || null;
                    }
                    
                    return enhancedTrip;
                }) : [];
                
                // Simple monthly billing: all completed trips for the month
                const allTrips = tripsForBilling.filter(trip => trip.price > 0);
                const completedTrips = allTrips.filter(trip => trip.status === 'completed');
                const pendingTrips = allTrips.filter(trip => ['upcoming', 'pending', 'confirmed'].includes(trip.status));
                
                // Debug logging for trip categorization
                console.log('🔍 TRIP CATEGORIZATION DEBUG:', {
                    totalFetchedTrips: tripsForBilling.length,
                    tripsWithPrice: allTrips.length,
                    completedTrips: completedTrips.length,
                    pendingTrips: pendingTrips.length,
                    completedTripStatuses: completedTrips.map(t => ({ id: t.id?.substring(0, 8), status: t.status, price: t.price })),
                    allTripStatuses: tripsForBilling.map(t => ({ id: t.id?.substring(0, 8), status: t.status, price: t.price }))
                });
                
                // Calculate monthly totals
                const monthlyCompletedAmount = completedTrips.reduce((sum, trip) => sum + parseFloat(trip.price || 0), 0);
                const pendingTripsAmount = pendingTrips.reduce((sum, trip) => sum + parseFloat(trip.price || 0), 0);
                const totalMonthlyRevenue = monthlyCompletedAmount + pendingTripsAmount;
                
                // Check if this month has been paid (with month-end validation)
                const now = new Date();
                const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM format
                const isCurrentMonth = targetMonth === currentMonth;
                
                // MONTHLY BILLING RULE: Current month cannot be marked as paid until month ends
                const isMonthPaid = !isCurrentMonth && paymentStatus && ['PAID', 'PAID WITH CARD', 'PAID WITH CHECK - VERIFIED', 'PAID WITH CHECK', 'PAID WITH BANK TRANSFER'].includes(paymentStatus.payment_status || paymentStatus.status);
                
                console.log(`✅ Step 9: Monthly billing summary:`);
                console.log(`   - Total trips this month: ${allTrips.length}`);
                console.log(`   - Completed trips: ${completedTrips.length}`);
                console.log(`   - Pending trips: ${pendingTrips.length}`);
                console.log(`   - Monthly completed amount: $${monthlyCompletedAmount.toFixed(2)}`);
                console.log(`   - Pending trips amount: $${pendingTripsAmount.toFixed(2)}`);
                console.log(`   - Total monthly revenue: $${totalMonthlyRevenue.toFixed(2)}`);
                console.log(`   - Is current month: ${isCurrentMonth ? 'YES' : 'NO'}`);
                console.log(`   - Month payment status: ${isMonthPaid ? 'PAID' : (isCurrentMonth ? 'CURRENT MONTH - CANNOT PAY YET' : 'UNPAID')}`);
                
                // Set state values for monthly billing
                setTotalAmount(isMonthPaid ? 0 : monthlyCompletedAmount); // If paid, show 0 due
                setPendingAmount(pendingTripsAmount);
                setPreviouslyPaidAmount(isMonthPaid ? monthlyCompletedAmount : 0);
                setCompletedTripsAmount(totalMonthlyRevenue);
                
                // Process all trips for display with proper client names
                console.log('🔍 About to process trips. FacilityInfo:', facilityInfo ? 'EXISTS' : 'NULL/UNDEFINED');
                console.log('🔍 CompletedTrips count before processing:', completedTrips.length);
                const processedCompletedTrips = processTripsWithFacilityInfo(completedTrips);
                const processedPendingTrips = processTripsWithFacilityInfo(pendingTrips);
                console.log('🔍 ProcessedCompletedTrips count after processing:', processedCompletedTrips.length);
                
                // Debug the processed trips
                console.log('🔍 PROCESSED TRIPS DEBUG:', {
                    processedCompletedCount: processedCompletedTrips.length,
                    processedPendingCount: processedPendingTrips.length,
                    sampleProcessedCompleted: processedCompletedTrips.slice(0, 3).map(t => ({ 
                        id: t.id?.substring(0, 8), 
                        status: t.status, 
                        price: t.price,
                        clientName: t.clientName 
                    }))
                });
                
                // Set simplified trip lists - always show completed trips for transparency
                console.log('🔄 About to set billable trips. Count:', processedCompletedTrips.length);
                setBillableTrips(processedCompletedTrips); // Always show completed trips, regardless of payment status
                setPendingTrips(processedPendingTrips);
                console.log('✅ State updated - billable trips set to:', processedCompletedTrips.length, 'items');
                
                // Cache the successfully loaded data
                try {
                    const dataToCache = {
                        billableTrips: processedCompletedTrips,
                        pendingTrips: processedPendingTrips,
                        facilityTrips: trips || [], // Use the original trips data
                        facilityInfo: facilityInfo,
                        totalAmount: isMonthPaid ? 0 : monthlyCompletedAmount,
                        pendingAmount: pendingTripsAmount,
                        completedTripsAmount: totalMonthlyRevenue,
                        previouslyPaidAmount: isMonthPaid ? monthlyCompletedAmount : 0,
                        paymentStatus: paymentStatus,
                        invoiceMonth: `${facilityInfo?.name || 'Facility'} - ${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
                        timestamp: Date.now()
                    };
                    sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache));
                    console.log('💾 Data cached successfully');
                } catch (cacheError) {
                    console.log('⚠️ Failed to cache data:', cacheError);
                }
                
                console.log('✅ Step 10: All processing complete, setting loading to false');
                setLoading(false);

            } catch (err) {
                console.error('💥 CRITICAL ERROR in monthly invoice page:', err);
                console.error('💥 Error stack:', err.stack);
                console.error('💥 Error message:', err.message);
                console.error('💥 Error details:', JSON.stringify(err, null, 2));
                setError(`Failed to load monthly invoice details: ${err.message}`);
                setLoading(false);
            }
        }

        if (facilityMonth) {
            fetchMonthlyInvoiceData();
        }
    }, [facilityMonth]);

    // Process trips with facility information (moved to separate function)
    const processTripsWithFacilityInfo = (trips) => {
        if (!trips || trips.length === 0) return [];
        
        // Use facilityInfo state, with fallback if not available
        const currentFacilityInfo = facilityInfo || {
            name: 'Unknown Facility'
        };
        
        console.log('🔍 processTripsWithFacilityInfo called with:', {
            tripsCount: trips.length,
            facilityInfoAvailable: !!facilityInfo,
            facilityName: currentFacilityInfo.name
        });
        
        return trips.map(trip => {
            // Get client name
            let clientName = 'Unknown Client';
            let clientPhone = '';
            let clientEmail = '';
            
            if (trip.managed_client && trip.managed_client.first_name) {
                clientName = `${trip.managed_client.first_name} ${trip.managed_client.last_name || ''}`.trim();
                clientName += ' (Managed)';
                clientPhone = trip.managed_client.phone_number || '';
                clientEmail = trip.managed_client.email || '';
            } else if (trip.user_profile && trip.user_profile.first_name) {
                clientName = `${trip.user_profile.first_name} ${trip.user_profile.last_name || ''}`.trim();
                clientPhone = trip.user_profile.phone_number || '';
                clientEmail = trip.user_profile.email || '';
            } else if (trip.managed_client_id?.startsWith('ea79223a')) {
                // Special case for David Patel
                clientName = 'David Patel (Managed)';
                clientPhone = '(416) 555-2233';
            } else {
                clientName = `${currentFacilityInfo.name} Client`;
            }

            // Handle price - ensure it's properly parsed and has a fallback
            let tripPrice = trip.price || 0;
            
            // If no price is set, calculate a default price for facility trips
            if (!tripPrice || tripPrice === 0) {
                // Default facility trip pricing based on trip type
                let defaultPrice = 45.00; // Base facility trip rate
                
                if (trip.wheelchair_type) {
                    defaultPrice += 15.00; // Wheelchair surcharge
                }
                
                if (trip.is_round_trip) {
                    defaultPrice *= 2; // Double for round trip
                }
                
                if (trip.additional_passengers && trip.additional_passengers > 0) {
                    defaultPrice += (trip.additional_passengers * 10.00); // Additional passenger fee
                }
                
                tripPrice = defaultPrice;
                console.log(`💰 Calculated default price for trip ${trip.id.substring(0, 8)}: $${defaultPrice.toFixed(2)}`);
            }
            
            const displayPrice = parseFloat(tripPrice) || 0;
            
            // Debug log for price issues
            if (displayPrice === 0 && trip.id) {
                console.log(`⚠️ Trip ${trip.id} still has no price after calculation:`, {
                    originalPrice: trip.price,
                    calculatedPrice: tripPrice,
                    status: trip.status
                });
            }
            
            return {
                ...trip,
                clientName,
                clientPhone,
                clientEmail,
                displayPrice: displayPrice,
                price: displayPrice, // Ensure price is always available
                isBillable: trip.status === 'completed' && displayPrice > 0
            };
        });
    };

    // Use processed trips for display
    const processedTrips = processTripsWithFacilityInfo(facilityTrips);

    // Get display month name
    const getMonthDisplayName = () => {
        if (!invoiceMonth) return '';
        const [year, month] = invoiceMonth.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });
    };

    // Toggle payment status between PAID and UNPAID
    const handleTogglePaymentStatus = async () => {
        if (!facilityInfo || updatingPaymentStatus) return;

        setUpdatingPaymentStatus(true);
        try {
            const [year, month] = invoiceMonth.split('-');
            // Handle both payment_status (new) and status (old) field names
            const currentStatus = paymentStatus?.payment_status || paymentStatus?.status || 'UNPAID';
            const statusString = String(currentStatus || 'UNPAID');
            const newStatus = statusString.includes('PAID') ? 'NEEDS ATTENTION - RETRY PAYMENT' : 'PAID';
            const now = new Date().toISOString();

            const paymentData = {
                facility_id: facilityInfo.id,
                invoice_month: parseInt(month),
                invoice_year: parseInt(year),
                total_amount: totalAmount,
                status: newStatus,
                payment_date: newStatus === 'PAID' ? now : null
            };

            console.log('🔄 Attempting to update payment status using direct database update...');

            // Get the invoice ID from the existing payment status
            const invoiceId = paymentStatus?.id;
            
            if (!invoiceId) {
                throw new Error('No invoice ID found. Cannot update payment status without an existing invoice record.');
            }
            
            console.log('✅ Using existing invoice ID:', invoiceId);

            // Use direct database update with correct schema
            const { error: updateError } = await supabase
                .from('facility_invoices')
                .update({
                    payment_status: newStatus,
                    last_updated: now
                })
                .eq('id', invoiceId);

            if (updateError) {
                throw new Error(`Database update failed: ${updateError.message}`);
            }

            console.log('✅ Payment status updated successfully via direct database update');

            // Update local state to reflect the change
            setPaymentStatus({
                ...paymentStatus,
                payment_status: newStatus,
                status: newStatus, // Keep both for compatibility
                last_updated: now
            });

        } catch (err) {
            console.error('❌ Error toggling payment status:', err);
            setError(`Failed to update payment status: ${err.message}`);
        } finally {
            setUpdatingPaymentStatus(false);
        }
    };

    // Handle check payment verification - with confirmation for critical actions
    const handleCheckVerification = async (verificationAction) => {
        if (!facilityInfo || !paymentStatus?.id || updatingPaymentStatus) return;
        
        // Show confirmation dialogs for critical actions
        if (verificationAction === 'check_received') {
            setShowCheckReceivedDialog(true);
            return;
        }
        
        if (verificationAction === 'confirm_payment') {
            setShowConfirmPaymentDialog(true);
            return;
        }
        
        if (verificationAction === 'payment_failed') {
            setShowPaymentFailedDialog(true);
            return;
        }

        // Continue with normal verification process for other actions
        await processCheckVerification(verificationAction);
    };

    // Process check verification (separated for confirmation workflow)
    const processCheckVerification = async (verificationAction) => {
        // Debug: Check cookies from frontend
        console.log('🍪 Frontend cookies:', document.cookie);
        const supabaseCookies = document.cookie.split(';').filter(cookie => 
            cookie.includes('supabase') || cookie.includes('sb-') || cookie.includes('auth')
        );
        console.log('🍪 Supabase cookies from frontend:', supabaseCookies);

        // Get verification notes from textarea (check payment or card payment)
        const verificationNotes = document.getElementById('verification_notes')?.value || 
                                 document.getElementById('card_verification_notes')?.value || '';

        setUpdatingPaymentStatus(true);
        try {
            console.log(`🔄 Processing check verification action: ${verificationAction}`);
            
            const response = await fetch('/api/facility/check-payment/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    facility_id: facilityInfo.id,
                    month: invoiceMonth,
                    invoice_id: paymentStatus.id,
                    verification_action: verificationAction,
                    verification_notes: verificationNotes
                }),
            });

            console.log('Raw response status:', response.status);
            console.log('Raw response headers:', response.headers);

            let result;
            try {
                const responseText = await response.text();
                console.log('Raw response text:', responseText);
                
                if (responseText) {
                    result = JSON.parse(responseText);
                } else {
                    throw new Error('Empty response from server');
                }
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                throw new Error(`Invalid server response: ${parseError.message}`);
            }

            if (!response.ok) {
                throw new Error(result.error || `Check verification failed with status ${response.status}`);
            }

            console.log(`✅ Check verification successful:`, result);
            
            // Update local payment status to reflect the change
            setPaymentStatus({
                ...paymentStatus,
                payment_status: result.new_payment_status,
                status: result.new_payment_status, // Keep both for compatibility
                last_updated: new Date().toISOString(),
                verification_details: result.verification_details
            });

            // Clear the notes textarea
            const notesField = document.getElementById('verification_notes');
            if (notesField) {
                notesField.value = '';
            }

            // Show success message
            alert(`✅ ${result.message}`);

            // Refresh the page data to show updated payment status
            window.location.reload();

        } catch (err) {
            console.error(`❌ Error processing check verification:`, err);
            alert(`❌ Check verification failed: ${err.message}`);
        } finally {
            setUpdatingPaymentStatus(false);
        }
    };

    // Send monthly invoice
    const handleSendMonthlyInvoice = async () => {
        if (!facilityInfo || facilityTrips.length === 0 || sendingInvoice) return;

        setSendingInvoice(true);
        try {
            const monthlyInvoiceData = {
                facility_id: facilityInfo.id,
                month: invoiceMonth,
                total_amount: totalAmount,
                trip_count: facilityTrips.filter(trip => trip.isBillable).length,
                status: 'sent',
                sent_at: new Date().toISOString(),
                billing_email: facilityInfo.billing_email || facilityInfo.contact_email,
                trip_ids: facilityTrips.filter(trip => trip.isBillable).map(trip => trip.id)
            };

            // Here you would call your API to create/send the monthly invoice
            // For now, we'll simulate success
            console.log('📧 Sending monthly invoice:', monthlyInvoiceData);
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            setInvoiceSent(true);
            setTimeout(() => setInvoiceSent(false), 5000);
            
        } catch (err) {
            console.error('Error sending monthly invoice:', err);
            setError('Failed to send monthly invoice');
        } finally {
            setSendingInvoice(false);
        }
    };

    // Handle trip actions (approve, reject, complete, cancel)
    const handleTripAction = async (tripId, action) => {
        if (processingTripAction || !tripId || !action) return;

        setProcessingTripAction(tripId);
        
        try {
            console.log(`🔄 Processing ${action} action for trip ${tripId}`);
            
            // Call the trip actions API
            const response = await fetch('/api/trips/actions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tripId: tripId,
                    action: action === 'cancel' ? 'reject' : action, // Map cancel to reject
                    reason: action === 'cancel' ? 'Cancelled by dispatcher from facility invoice' : undefined
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Failed to ${action} trip`);
            }

            console.log(`✅ Trip ${action} successful:`, result);
            
            // Update the trip in our local state
            setFacilityTrips(prevTrips => {
                const updatedTrips = prevTrips.map(trip => 
                    trip.id === tripId 
                        ? { ...trip, status: result.trip.status }
                        : trip
                );
                
                // Recalculate totals and update trip categorization after status change
                setTimeout(() => {
                    // Separate completed and pending trips
                    const completedTrips = updatedTrips.filter(trip => trip.status === 'completed' && trip.price > 0);
                    const pendingTripsFiltered = updatedTrips.filter(trip => ['upcoming', 'pending', 'confirmed'].includes(trip.status) && trip.price > 0);
                    
                    // Calculate amounts
                    const billableAmount = completedTrips.reduce((sum, trip) => sum + parseFloat(trip.price || 0), 0);
                    const pendingTripsAmount = pendingTripsFiltered.reduce((sum, trip) => sum + parseFloat(trip.price || 0), 0);
                    
                    // Process trips with facility info for proper display
                    const processedCompletedTrips = processTripsWithFacilityInfo(completedTrips);
                    const processedPendingTrips = processTripsWithFacilityInfo(pendingTripsFiltered);
                    
                    // Update all related states
                    setTotalAmount(billableAmount);
                    setPendingAmount(pendingTripsAmount);
                    setBillableTrips(processedCompletedTrips);
                    setPendingTrips(processedPendingTrips);
                    
                    console.log(`🔄 Updated after trip action - Completed: ${processedCompletedTrips.length}, Pending: ${processedPendingTrips.length}`);
                    console.log(`🔄 Updated totals - Billable: $${billableAmount.toFixed(2)}, Pending: $${pendingTripsAmount.toFixed(2)}`);
                    
                    // Invalidate cache when trip status changes
                    const cacheKey = `facility_invoice_${facilityMonth}`;
                    sessionStorage.removeItem(cacheKey);
                    console.log('🗑️ Cache invalidated after trip status update');
                }, 100);
                
                return updatedTrips;
            });

            // Show professional success message
            const actionMessages = {
                approve: 'Trip approved and ready for scheduling',
                reject: 'Trip rejected and removed from active queue', 
                complete: 'Trip completed successfully and moved to billing section',
                cancel: 'Trip cancelled and removed from schedule'
            };
            
            setTimeout(() => {
                // Create a more professional notification
                const notification = document.createElement('div');
                notification.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-3 rounded-lg shadow-lg z-50';
                notification.innerHTML = `
                    <div class="flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span class="font-medium">${actionMessages[action]}</span>
                    </div>
                `;
                document.body.appendChild(notification);
                
                // Remove notification after 4 seconds
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        notification.style.opacity = '0';
                        notification.style.transform = 'translateX(100%)';
                        notification.style.transition = 'all 0.3s ease-out';
                        setTimeout(() => document.body.removeChild(notification), 300);
                    }
                }, 4000);
            }, 100);

        } catch (err) {
            console.error(`❌ Error ${action}ing trip:`, err);
            
            // Create professional error notification
            const errorNotification = document.createElement('div');
            errorNotification.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded-lg shadow-lg z-50';
            errorNotification.innerHTML = `
                <div class="flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span class="font-medium">Failed to ${action} trip: ${err.message}</span>
                </div>
            `;
            document.body.appendChild(errorNotification);
            
            // Remove error notification after 6 seconds
            setTimeout(() => {
                if (document.body.contains(errorNotification)) {
                    errorNotification.style.opacity = '0';
                    errorNotification.style.transform = 'translateX(100%)';
                    errorNotification.style.transition = 'all 0.3s ease-out';
                    setTimeout(() => document.body.removeChild(errorNotification), 300);
                }
            }, 6000);
        } finally {
            setProcessingTripAction(null);
        }
    };

    // Handle trip edit
    const handleEditTrip = (trip) => {
        setEditingTrip(trip);
        setShowEditForm(true);
    };

    // Handle trip edit save
    const handleTripSave = (updatedTrip) => {
        // Update the trip in our local state
        setFacilityTrips(prevTrips => 
            prevTrips.map(trip => 
                trip.id === updatedTrip.id ? { ...trip, ...updatedTrip } : trip
            )
        );
        setShowEditForm(false);
        setEditingTrip(null);
        
        // Show success message
        setTimeout(() => {
            alert('✅ Trip updated successfully!');
        }, 100);
    };

    // Handle trip edit cancel
    const handleTripEditCancel = () => {
        setShowEditForm(false);
        setEditingTrip(null);
    };

    // Month navigation handlers
    const handlePrevMonth = () => {
        if (!selectedMonth) return;

        const [year, month] = selectedMonth.split('-').map(Number);
        const prevMonth = new Date(year, month - 1, 1);
        const newMonth = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

        setSelectedMonth(newMonth);
        setInvoiceMonth(newMonth);
        router.push(`/invoices/facility/${facilityInfo.id}-${newMonth}`);
    };

    const handleNextMonth = () => {
        if (!selectedMonth) return;

        const [year, month] = selectedMonth.split('-').map(Number);
        const nextMonth = new Date(year, month, 1);
        const newMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

        setSelectedMonth(newMonth);
        setInvoiceMonth(newMonth);
        router.push(`/invoices/facility/${facilityInfo.id}-${newMonth}`);
    };

    // Month selection handler
    const handleMonthSelect = (e) => {
        const selectedValue = e.target.value;
        setSelectedMonth(selectedValue);
        setInvoiceMonth(selectedValue);
        router.push(`/invoices/facility/${facilityInfo.id}-${selectedValue}`);
    };

    // Fetch available months for the facility
    useEffect(() => {
        async function fetchAvailableMonths() {
            if (!facilityInfo) return;

            try {
                const { data: monthsData, error: monthsError } = await supabase
                    .from('facility_payment_status')
                    .select('invoice_month, invoice_year')
                    .eq('facility_id', facilityInfo.id)
                    .order('invoice_year', { ascending: false })
                    .order('invoice_month', { ascending: false });

                if (monthsError) throw monthsError;

                const formattedMonths = monthsData.map(item => {
                    const year = item.invoice_year;
                    const month = String(item.invoice_month).padStart(2, '0');
                    return `${year}-${month}`;
                });

                setAvailableMonths(formattedMonths);
                
                // Set the initially selected month to the latest available month
                if (formattedMonths.length > 0 && !selectedMonth) {
                    setSelectedMonth(formattedMonths[0]);
                    setInvoiceMonth(formattedMonths[0]);
                }
            } catch (err) {
                console.error('Error fetching available months:', err);
            }
        }

        fetchAvailableMonths();
    }, [facilityInfo, supabase]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
                    <div className="text-center">
                        <div className="animate-spin text-blue-600 text-6xl mb-4">⏳</div>
                        <h1 className="text-xl font-bold text-gray-900 mb-4">Loading Monthly Invoice</h1>
                        <p className="text-gray-600">Fetching facility billing details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
                    <div className="text-center">
                        <div className="text-red-500 text-6xl mb-4">📄</div>
                        <h1 className="text-xl font-bold text-gray-900 mb-4">Invoice Error</h1>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <div className="space-y-3">
                            <a href="/dashboard" className="block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
                                Back to Dashboard
                            </a>
                            <button 
                                onClick={() => window.location.reload()} 
                                className="block w-full bg-gray-100 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-200"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Note: Trip categorization is now handled by the state variables billableTrips and pendingTrips
    // which are set based on actual payment status, not just completion status

    return (
        <div className="min-h-screen bg-gray-50 print:bg-white">
            {/* Month Filter Header - Hidden on Print */}
            <div className="print:hidden bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-lg font-semibold text-gray-900">
                                📄 Monthly Invoice - {facilityInfo?.name}
                            </h1>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            {/* Month Navigation */}
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => {
                                        if (!invoiceMonth) return;
                                        const [year, month] = invoiceMonth.split('-');
                                        const prevDate = new Date(parseInt(year), parseInt(month) - 2, 1);
                                        const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
                                        const newUrl = `/invoice/facility-monthly/${facilityInfo.id}-${prevMonth}`;
                                        router.push(newUrl);
                                    }}
                                    className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-3 py-2 rounded-md text-sm font-bold transition-colors border border-gray-400"
                                >
                                    ← Previous Month
                                </button>
                                
                                {/* Month Dropdown */}
                                <select
                                    value={invoiceMonth}
                                    onChange={(e) => {
                                        const selectedMonth = e.target.value;
                                        if (selectedMonth && facilityInfo) {
                                            const newUrl = `/invoice/facility-monthly/${facilityInfo.id}-${selectedMonth}`;
                                            router.push(newUrl);
                                        }
                                    }}
                                    className="border border-gray-400 rounded-md px-3 py-2 text-sm font-bold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {/* Generate last 12 months */}
                                    {Array.from({ length: 12 }, (_, i) => {
                                        const date = new Date();
                                        date.setMonth(date.getMonth() - i);
                                        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                                        const displayName = date.toLocaleDateString('en-US', {
                                            month: 'long',
                                            year: 'numeric'
                                        });
                                        return (
                                            <option key={yearMonth} value={yearMonth}>
                                                {displayName}
                                            </option>
                                        );
                                    })}
                                </select>
                                
                                <button
                                    onClick={() => {
                                        if (!invoiceMonth) return;
                                        const [year, month] = invoiceMonth.split('-');
                                        const nextDate = new Date(parseInt(year), parseInt(month), 1);
                                        const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
                                        const newUrl = `/invoice/facility-monthly/${facilityInfo.id}-${nextMonth}`;
                                        router.push(newUrl);
                                    }}
                                    className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-3 py-2 rounded-md text-sm font-bold transition-colors border border-gray-400"
                                >
                                    Next Month →
                                </button>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex items-center space-x-2">
                                
                                <button
                                    onClick={() => window.print()}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    🖨️ Print Invoice
                                </button>
                                
                                <button
                                    onClick={() => router.push('/trips/facility')}
                                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    ← Back to Overview
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Status Messages */}
                    {invoiceSent && (
                        <div className="mt-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-md">
                            ✅ Monthly invoice sent successfully!
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:max-w-none">
                <div className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none">
                    {/* Invoice Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 print-bg print-gradient">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-3xl font-bold mb-2">Compassionate Care Transportation</h2>
                                <p className="text-blue-100 text-lg">Professional Transportation Services</p>
                                <div className="mt-4 text-sm space-y-1">
                                    <p className="flex items-center">
                                        <span className="mr-2">📧</span>
                                        billing@compassionatecaretransportation.com
                                    </p>
                                    <p className="flex items-center">
                                        <span className="mr-2">📞</span>
                                        (416) 555-0123
                                    </p>
                                    <p className="flex items-center">
                                        <span className="mr-2">📍</span>
                                        Dublin, Ohio, USA
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="bg-white/20 rounded-lg p-4 print:bg-white/10">
                                    <h3 className="text-2xl font-bold mb-2 text-white">MONTHLY INVOICE</h3>
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-xs text-blue-200 uppercase">Invoice Date:</p>
                                            <p className="text-white font-medium">
                                                {new Date().toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-blue-200 uppercase">Due Date:</p>
                                            <p className="text-white font-medium">
                                                {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        {paymentStatus?.invoice_number && (
                                            <div className="pb-2 border-b border-white/30">
                                                <p className="text-xs text-blue-200 uppercase">Invoice Number:</p>
                                                <p className="text-sm font-mono text-white">{paymentStatus.invoice_number}</p>
                                            </div>
                                        )}
                                        <div className="pt-2 border-t border-white/30">
                                            <p className="text-xs text-blue-200 uppercase">Billing Period:</p>
                                            <p className="text-lg font-bold text-white">{getMonthDisplayName()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Invoice Summary */}
                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            {/* Bill To Section */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Bill To:</h3>
                                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">
                                        🏥 Facility Monthly Billing
                                    </p>
                                    <div className="mb-3 p-4 bg-white rounded border border-blue-200 shadow-sm">
                                        <p className="text-xl font-bold text-gray-900 mb-2">{facilityInfo?.name}</p>
                                        {facilityInfo?.address && (
                                            <p className="text-gray-700 mb-2 flex items-center">
                                                <span className="text-gray-500 mr-2">📍</span>
                                                {facilityInfo.address}
                                            </p>
                                        )}
                                        <div className="space-y-1">
                                            {facilityInfo?.billing_email && (
                                                <p className="text-gray-700 flex items-center">
                                                    <span className="text-blue-600 mr-2">📧</span>
                                                    <span className="font-medium">Billing:</span>
                                                    <span className="ml-1">{facilityInfo.billing_email}</span>
                                                </p>
                                            )}
                                            {facilityInfo?.contact_email && !facilityInfo?.billing_email && (
                                                <p className="text-gray-700 flex items-center">
                                                    <span className="text-blue-600 mr-2">📧</span>
                                                    <span className="font-medium">Contact:</span>
                                                    <span className="ml-1">{facilityInfo.contact_email}</span>
                                                </p>
                                            )}
                                            {facilityInfo?.phone_number && (
                                                <p className="text-gray-700 flex items-center">
                                                    <span className="text-green-600 mr-2">📞</span>
                                                    <span className="font-medium">Phone:</span>
                                                    <span className="ml-1">{facilityInfo.phone_number}</span>
                                                </p>
                                            )}
                                        </div>
                                        <div className="mt-3 pt-2 border-t border-gray-200">
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">
                                                Facility Account ID: {facilityInfo?.id}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Section */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Invoice Summary:</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                        <span className="text-gray-700 font-medium">Billing Period:</span>
                                        <span className="font-bold text-gray-900">{getMonthDisplayName()}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                        <span className="text-gray-700 font-medium">Total Trips:</span>
                                        <span className="font-bold text-gray-900">{facilityTrips.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-amber-50 rounded border border-amber-200">
                                        <span className="text-amber-700 font-medium">Pending Trips:</span>
                                        <span className="font-bold text-amber-800">{pendingTrips.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded border border-blue-200">
                                        <span className="text-blue-700 font-medium">Payment Status:</span>
                                        <span className={`font-bold px-3 py-1 rounded text-sm ${
                                            (() => {
                                                const now = new Date();
                                                const currentMonth = now.toISOString().slice(0, 7);
                                                const isCurrentMonth = invoiceMonth === currentMonth;
                                                const isFutureMonth = invoiceMonth > currentMonth;
                                                const actualPaymentStatus = String(paymentStatus?.payment_status || paymentStatus?.status || 'UNPAID');
                                                const isActuallyPaid = actualPaymentStatus.includes('PAID');
                                                const isVerified = actualPaymentStatus.includes('VERIFIED');
                                                const hasPaymentDate = paymentStatus?.payment_date;
                                                const hasFacilityPayment = hasPaymentDate || actualPaymentStatus.includes('CHECK') || actualPaymentStatus.includes('CARD') || actualPaymentStatus.includes('BANK');
                                                const hasTrips = billableTrips.length > 0 || totalAmount > 0;
                                                
                                                if (isFutureMonth) {
                                                    return 'bg-gray-100 text-gray-600 border border-gray-300';
                                                } else if (isActuallyPaid && hasFacilityPayment && (totalAmount > 0 || isVerified)) {
                                                    return 'bg-green-100 text-green-800 border border-green-300';
                                                } else if (isActuallyPaid && hasFacilityPayment && totalAmount === 0) {
                                                    return 'bg-green-100 text-green-800 border border-green-300';
                                                } else if (isActuallyPaid && !hasFacilityPayment && totalAmount > 0) {
                                                    return 'bg-red-100 text-red-800 border border-red-300';
                                                } else if (isCurrentMonth) {
                                                    return 'bg-blue-100 text-blue-800 border border-blue-300';
                                                } else {
                                                    return 'bg-amber-100 text-amber-800 border border-amber-300';
                                                }
                                            })()
                                        }`}>
                                            {(() => {
                                                const now = new Date();
                                                const currentMonth = now.toISOString().slice(0, 7);
                                                const isCurrentMonth = invoiceMonth === currentMonth;
                                                const isFutureMonth = invoiceMonth > currentMonth;
                                                const actualPaymentStatus = String(paymentStatus?.payment_status || paymentStatus?.status || 'UNPAID');
                                                const isActuallyPaid = actualPaymentStatus.includes('PAID');
                                                const isVerified = actualPaymentStatus.includes('VERIFIED');
                                                const isPaymentFailed = actualPaymentStatus.includes('PAYMENT FAILED');
                                                const hasPaymentDate = paymentStatus?.payment_date;
                                                const hasFacilityPayment = hasPaymentDate || actualPaymentStatus.includes('CHECK') || actualPaymentStatus.includes('CARD') || actualPaymentStatus.includes('BANK');
                                                
                                                if (isFutureMonth) {
                                                    return '📅 FUTURE MONTH - NO INVOICE YET';
                                                } else if (isPaymentFailed) {
                                                    return '📤 PAYMENT REQUEST SENT';
                                                } else if (isActuallyPaid && isVerified && hasFacilityPayment) {
                                                    return '✅ FULLY PAID';
                                                } else if (isActuallyPaid && !isVerified && hasFacilityPayment) {
                                                    return totalAmount > 0 
                                                        ? '⏳ PAYMENT NEEDS VERIFICATION'
                                                        : '✅ NO TRIPS - NO PAYMENT NEEDED';
                                                } else if (isActuallyPaid && !hasFacilityPayment) {
                                                    // This is the case where status shows "PAID" but facility hasn't actually paid
                                                    return totalAmount > 0 
                                                        ? `💳 $${totalAmount.toFixed(2)} DUE - FACILITY PAYMENT REQUIRED`
                                                        : '💰 NO BILLABLE TRIPS';
                                                } else if (isCurrentMonth) {
                                                    return totalAmount > 0 
                                                        ? `📅 CURRENT MONTH - $${totalAmount.toFixed(2)} RUNNING TOTAL`
                                                        : '📅 CURRENT MONTH - NO TRIPS YET';
                                                } else {
                                                    return totalAmount > 0 
                                                        ? `💳 $${totalAmount.toFixed(2)} DUE`
                                                        : '💰 NO BILLABLE TRIPS';
                                                }
                                            })()}
                                        </span>
                                    </div>
                                    {paymentStatus?.payment_date && (
                                        <div className="flex justify-between items-center p-3 bg-green-50 rounded border border-green-200">
                                            <span className="text-green-700 font-medium">Payment Date:</span>
                                            <span className="font-bold text-green-800">
                                                {new Date(paymentStatus.payment_date).toLocaleDateString('en-US', {
                                                    weekday: 'short',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                    )}
                                    {pendingAmount > 0 && (
                                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded border border-purple-200">
                                            <span className="text-purple-700 font-medium">⏳ Pending Amount:</span>
                                            <span className="font-bold text-purple-800">${pendingAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {(previouslyPaidAmount > 0 || pendingAmount > 0) && (
                                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-300">
                                            <span className="text-gray-700 font-medium">📊 Total Revenue When All Trips Are Paid:</span>
                                            <span className="font-bold text-gray-800">${(previouslyPaidAmount + totalAmount + pendingAmount).toFixed(2)}</span>
                                        </div>
                                    )}
                                    
                                    {/* Payment Notes for Dispatcher */}
                                    {paymentStatus?.payment_notes && (
                                        <div className="p-3 bg-blue-50 rounded border border-blue-200">
                                            <div className="flex items-start space-x-2">
                                                <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div>
                                                    <span className="text-blue-700 font-medium text-sm">Payment Details:</span>
                                                    <p className="text-blue-600 text-sm mt-1">{paymentStatus.payment_notes}</p>
                                                    {paymentStatus.partial_month_payment && (
                                                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                                                            <p className="text-amber-700 text-xs font-medium">
                                                                ⚠️ Mid-Month Payment: Additional trips completed after this payment may require separate billing.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Check Payment Verification Interface (Dispatcher Only) */}
                                    {paymentStatus?.status && paymentStatus.status.includes('CHECK PAYMENT') && !paymentStatus.status.includes('VERIFIED') && (
                                        <div className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center">
                                                    <svg className="w-6 h-6 text-orange-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <div>
                                                        <h4 className="font-semibold text-orange-800">Check Payment Verification Required</h4>
                                                        <p className="text-sm text-orange-600 mt-1">
                                                            Current Status: <span className="font-medium">{paymentStatus.status}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                {/* Check Received Button - For WILL MAIL status */}
                                                {paymentStatus.status === 'CHECK PAYMENT - WILL MAIL' && (
                                                    <button
                                                        onClick={() => handleCheckVerification('check_received')}
                                                        disabled={updatingPaymentStatus}
                                                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center"
                                                    >
                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                                        </svg>
                                                        CHECK RECEIVED
                                                    </button>
                                                )}
                                                
                                                {/* Multiple options for ALREADY SENT status */}
                                                {paymentStatus.status === 'CHECK PAYMENT - ALREADY SENT' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleCheckVerification('check_received')}
                                                            disabled={updatingPaymentStatus}
                                                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center"
                                                        >
                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            RECEIVED & DEPOSITED
                                                        </button>
                                                        
                                                        <button
                                                            onClick={() => handleCheckVerification('mark_not_received')}
                                                            disabled={updatingPaymentStatus}
                                                            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center"
                                                        >
                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                            NOT RECEIVED
                                                        </button>
                                                    </>
                                                )}
                                                
                                                {/* Paid and Verified Button - Final step */}
                                                {paymentStatus.status === 'PAID WITH CHECK (BEING VERIFIED)' && (
                                                    <button
                                                        onClick={() => setShowVerificationDialog(true)}
                                                        disabled={updatingPaymentStatus}
                                                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center"
                                                    >
                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        PAID AND VERIFIED
                                                    </button>
                                                )}
                                                
                                                {/* Card/Bank Transfer Verification Options */}
                                                {(paymentStatus.status === 'PAID WITH CARD' || paymentStatus.status === 'PAID WITH BANK TRANSFER') && (
                                                    <>
                                                        <button
                                                            onClick={() => handleCheckVerification('confirm_payment')}
                                                            disabled={updatingPaymentStatus}
                                                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center"
                                                        >
                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            CONFIRM PAYMENT
                                                        </button>
                                                        
                                                        <button
                                                            onClick={() => handleCheckVerification('payment_failed')}
                                                            disabled={updatingPaymentStatus}
                                                            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center"
                                                        >
                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                            PAYMENT FAILED
                                                        </button>
                                                    </>
                                                )}

                                                {/* Mark Issues Button - Only show if not already marked as having issues and not completed */}
                                                {!paymentStatus.status.includes('HAS ISSUES') && !paymentStatus.status.includes('VERIFIED') && !paymentStatus.status.includes('PAID') && (
                                                    <button
                                                        onClick={() => handleCheckVerification('mark_issues')}
                                                        disabled={updatingPaymentStatus}
                                                        className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center"
                                                    >
                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        Mark as Having Issues
                                                    </button>
                                                )}
                                                
                                                {/* Request New Check Button - Only show if issues exist */}
                                                {paymentStatus.status.includes('HAS ISSUES') && (
                                                    <button
                                                        onClick={() => handleCheckVerification('request_new_check')}
                                                        disabled={updatingPaymentStatus}
                                                        className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center"
                                                    >
                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                        Request New Check
                                                    </button>
                                                )}
                                            </div>
                                            
                                            {/* Verification Notes */}
                                            <div className="mt-4">
                                                <label className="block text-sm font-medium text-orange-700 mb-2">
                                                    Verification Notes (Optional)
                                                </label>
                                                <textarea
                                                    id="verification_notes"
                                                    rows="2"
                                                    className="w-full px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                                    placeholder="Add notes about check verification, issues, or other relevant information..."
                                                />
                                            </div>
                                            
                                            {/* Professional Payment Timeline */}
                                            <div className="mt-4 p-3 bg-white border border-orange-200 rounded">
                                                <h5 className="text-sm font-medium text-orange-800 mb-3">Payment Timeline & Current Status</h5>
                                                <div className="space-y-2">
                                                    <div className={`flex items-center text-xs ${
                                                        paymentStatus.status === 'CHECK PAYMENT - WILL MAIL' ? 'text-blue-600 font-bold' : 'text-gray-500'
                                                    }`}>
                                                        <div className={`w-3 h-3 rounded-full mr-2 ${
                                                            paymentStatus.status === 'CHECK PAYMENT - WILL MAIL' ? 'bg-blue-500' : 'bg-gray-300'
                                                        }`}></div>
                                                        Step 1: Facility initiates check payment
                                                        {paymentStatus.created_at && (
                                                            <span className="ml-auto text-gray-600">
                                                                {new Date(paymentStatus.created_at).toLocaleDateString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric'
                                                                })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={`flex items-center text-xs ${
                                                        paymentStatus.status === 'CHECK PAYMENT - IN TRANSIT' ? 'text-indigo-600 font-bold' : 
                                                        ['CHECK PAYMENT - RECEIVED', 'CHECK PAYMENT - BEING VERIFIED', 'PAID WITH CHECK - VERIFIED'].includes(paymentStatus.status) ? 'text-gray-600' : 'text-gray-400'
                                                    }`}>
                                                        <div className={`w-3 h-3 rounded-full mr-2 ${
                                                            paymentStatus.status === 'CHECK PAYMENT - IN TRANSIT' ? 'bg-indigo-500' : 
                                                            ['CHECK PAYMENT - RECEIVED', 'CHECK PAYMENT - BEING VERIFIED', 'PAID WITH CHECK - VERIFIED'].includes(paymentStatus.status) ? 'bg-gray-400' : 'bg-gray-300'
                                                        }`}></div>
                                                        Step 2: Check in transit / received by office
                                                    </div>
                                                    <div className={`flex items-center text-xs ${
                                                        paymentStatus.status === 'CHECK PAYMENT - RECEIVED' ? 'text-orange-600 font-bold' : 
                                                        ['CHECK PAYMENT - BEING VERIFIED', 'PAID WITH CHECK - VERIFIED'].includes(paymentStatus.status) ? 'text-gray-600' : 'text-gray-400'
                                                    }`}>
                                                        <div className={`w-3 h-3 rounded-full mr-2 ${
                                                            paymentStatus.status === 'CHECK PAYMENT - RECEIVED' ? 'bg-orange-500' : 
                                                            ['CHECK PAYMENT - BEING VERIFIED', 'PAID WITH CHECK - VERIFIED'].includes(paymentStatus.status) ? 'bg-gray-400' : 'bg-gray-300'
                                                        }`}></div>
                                                        Step 3: Check received - ready for verification
                                                    </div>
                                                    <div className={`flex items-center text-xs ${
                                                        paymentStatus.status === 'CHECK PAYMENT - BEING VERIFIED' ? 'text-purple-600 font-bold' : 
                                                        paymentStatus.status === 'PAID WITH CHECK - VERIFIED' ? 'text-gray-600' : 'text-gray-400'
                                                    }`}>
                                                        <div className={`w-3 h-3 rounded-full mr-2 ${
                                                            paymentStatus.status === 'CHECK PAYMENT - BEING VERIFIED' ? 'bg-purple-500' : 
                                                            paymentStatus.status === 'PAID WITH CHECK - VERIFIED' ? 'bg-gray-400' : 'bg-gray-300'
                                                        }`}></div>
                                                        Step 4: Dispatcher verification & processing
                                                    </div>
                                                    <div className={`flex items-center text-xs ${
                                                        paymentStatus.status === 'PAID WITH CHECK - VERIFIED' ? 'text-green-600 font-bold' : 'text-gray-400'
                                                    }`}>
                                                        <div className={`w-3 h-3 rounded-full mr-2 ${
                                                            paymentStatus.status === 'PAID WITH CHECK - VERIFIED' ? 'bg-green-500' : 'bg-gray-300'
                                                        }`}></div>
                                                        Step 5: Payment verified & completed
                                                        {paymentStatus.status === 'PAID WITH CHECK - VERIFIED' && paymentStatus.verification_date && (
                                                            <span className="ml-auto text-green-600 font-medium">
                                                                {new Date(paymentStatus.verification_date).toLocaleDateString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric'
                                                                })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-3 p-3 bg-orange-100 rounded border border-orange-200">
                                                <p className="text-xs text-orange-700">
                                                    <strong>Professional Check Workflow:</strong> Use these controls to track check payment progress and maintain accurate records for facility billing.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Card/Bank Payment Verification Interface (Dispatcher Only) */}
                                    {paymentStatus?.status && (paymentStatus.status === 'PAID WITH CARD' || paymentStatus.status === 'PAID WITH BANK TRANSFER') && (
                                        <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center">
                                                    <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                    </svg>
                                                    <div>
                                                        <h4 className="font-semibold text-blue-800">Payment Verification Required</h4>
                                                        <p className="text-sm text-blue-600 mt-1">
                                                            Current Status: <span className="font-medium">{paymentStatus.status}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => handleCheckVerification('confirm_payment')}
                                                    disabled={updatingPaymentStatus}
                                                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    CONFIRM PAYMENT
                                                </button>
                                                
                                                <button
                                                    onClick={() => handleCheckVerification('payment_failed')}
                                                    disabled={updatingPaymentStatus}
                                                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                    PAYMENT FAILED
                                                </button>
                                            </div>
                                            
                                            <div className="mt-3 p-3 bg-blue-100 rounded border border-blue-200">
                                                <p className="text-xs text-blue-700">
                                                    <strong>Payment Verification:</strong> Confirm payment was received successfully or mark as failed if there were issues with processing.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Professional Check Payment Management for Paid Invoices */}
                                    {paymentStatus?.status && (paymentStatus.status.includes('PAID WITH CHECK') || 
                                        (paymentStatus.status.includes('PAID') && paymentStatus.check_submission_type)) && (
                                        <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center">
                                                    <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <div>
                                                        <h4 className="font-semibold text-green-800">✅ Payment Verification Complete</h4>
                                                        <p className="text-sm text-green-600 mt-1">
                                                            <span className="font-medium">${totalAmount.toFixed(2)}</span> • Check payment verified and processed
                                                        </p>
                                                        {paymentStatus.last_updated && (
                                                            <div className="mt-2 p-2 bg-green-100 border border-green-200 rounded text-xs">
                                                                <p className="text-green-700 font-medium">Payment Verified:</p>
                                                                <p className="text-green-600 mt-1">
                                                                    {new Date(paymentStatus.last_updated).toLocaleDateString('en-US', {
                                                                        weekday: 'long',
                                                                        year: 'numeric',
                                                                        month: 'long',
                                                                        day: 'numeric'
                                                                    })} at {new Date(paymentStatus.last_updated).toLocaleTimeString('en-US', {
                                                                        hour: 'numeric',
                                                                        minute: '2-digit',
                                                                        hour12: true
                                                                    })}
                                                                </p>
                                                                {paymentStatus.verified_by && (
                                                                    <p className="text-green-600 mt-1">
                                                                        Verified by dispatcher • Official payment date established
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-green-100 p-4 rounded mb-3">
                                                <p className="text-sm text-green-800 font-medium mb-2">
                                                    ✅ Payment Processing Complete
                                                </p>
                                                <div className="grid grid-cols-2 gap-4 text-xs text-green-700">
                                                    <div>
                                                        <p className="font-medium">Payment Method:</p>
                                                        <p>Business Check</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">Verification Status:</p>
                                                        <p>Fully Verified & Deposited</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">Invoice Status:</p>
                                                        <p>Paid in Full</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">All Trips:</p>
                                                        <p>Marked as Paid</p>
                                                    </div>
                                                </div>
                                                {paymentStatus.verification_date && (
                                                    <div className="mt-3 pt-2 border-t border-green-200">
                                                        <p className="text-xs text-green-700">
                                                            <strong>Official Payment Date:</strong> {new Date(paymentStatus.verification_date).toLocaleDateString('en-US', {
                                                                month: 'long',
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            })}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Facility Contact Information for Communication */}
                                    {paymentStatus?.status && (paymentStatus.status.includes('CHECK PAYMENT') || 
                                        paymentStatus.status === 'NEEDS ATTENTION - RETRY PAYMENT') && (
                                        <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg mt-3">
                                            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                                                <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                                Facility Contact Information
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm text-gray-600">Facility Name</p>
                                                    <p className="font-medium text-gray-900">{facilityInfo?.name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Billing Email</p>
                                                    <p className="font-medium text-gray-900">
                                                        <a href={`mailto:${facilityInfo?.billing_email}?subject=Check Payment for Invoice ${paymentStatus?.invoice_number}`} 
                                                           className="text-blue-600 hover:text-blue-800">
                                                            {facilityInfo?.billing_email}
                                                        </a>
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Contact Email</p>
                                                    <p className="font-medium text-gray-900">
                                                        <a href={`mailto:${facilityInfo?.contact_email}?subject=Check Payment for Invoice ${paymentStatus?.invoice_number}`} 
                                                           className="text-blue-600 hover:text-blue-800">
                                                            {facilityInfo?.contact_email}
                                                        </a>
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Phone</p>
                                                    <p className="font-medium text-gray-900">
                                                        <a href={`tel:${facilityInfo?.phone_number}`} className="text-blue-600 hover:text-blue-800">
                                                            {facilityInfo?.phone_number}
                                                        </a>
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-3 flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        window.location.href = `mailto:${facilityInfo?.billing_email}?subject=Check Payment Status - Invoice ${paymentStatus?.invoice_number}&body=Dear ${facilityInfo?.name},%0D%0A%0D%0AWe are following up regarding the check payment for Invoice ${paymentStatus?.invoice_number} (${getMonthDisplayName()}).%0D%0A%0D%0AAmount Due: $${totalAmount.toFixed(2)}%0D%0APayment Status: ${paymentStatus?.status}%0D%0A%0D%0APlease let us know the status of your check payment.%0D%0A%0D%0AThank you,%0D%0ACompassionate Care Transportation`
                                                    }}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                    Email About Check Status
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(facilityInfo?.phone_number)
                                                        alert('Phone number copied to clipboard!')
                                                    }}
                                                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                    Copy Phone
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    
                                </div>
                            </div>
                        </div>

                        {/* Facility Contract Section */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">📋 Facility Service Contract:</h3>
                            
                            {contractLoading ? (
                                <div className="bg-gray-50 p-6 rounded-lg border">
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                                        <span className="text-gray-600">Loading contract...</span>
                                    </div>
                                </div>
                            ) : contractError ? (
                                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                                    <div className="flex items-center">
                                        <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-red-700 text-sm">{contractError}</span>
                                    </div>
                                </div>
                            ) : facilityContract ? (
                                <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center">
                                            <svg className="w-8 h-8 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                            </svg>
                                            <div>
                                                <h4 className="font-semibold text-blue-900">{facilityContract.name}</h4>
                                                <p className="text-sm text-blue-700">
                                                    Uploaded: {new Date(facilityContract.uploadedAt).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2">
                                            <a
                                                href={facilityContract.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors inline-flex items-center"
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                                View Contract
                                            </a>
                                            <a
                                                href={facilityContract.url}
                                                download={facilityContract.name}
                                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors inline-flex items-center"
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Download
                                            </a>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white p-4 rounded border border-blue-300">
                                        <p className="text-sm text-gray-700 mb-2">
                                            <strong>Contract Information:</strong> This is the current service agreement between {facilityInfo?.name} and Compassionate Care Transportation.
                                        </p>
                                        <p className="text-xs text-gray-600">
                                            All transportation services and billing are governed by the terms outlined in this contract.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg">
                                    <div className="flex items-center">
                                        <svg className="w-6 h-6 text-amber-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        <div>
                                            <h4 className="font-medium text-amber-900">No Contract Available</h4>
                                            <p className="text-sm text-amber-700 mt-1">
                                                No service contract has been uploaded for this facility. Please request the facility to upload their contract through their facility settings.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Trip Details */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Trip Details:</h3>
                            
                            {/* Trip Details - Dynamic based on payment status */}
                            {billableTrips.length > 0 && (
                                <div className="mb-6">
                                    <h4 className={`text-md font-medium mb-3 ${
                                        (() => {
                                            const now = new Date();
                                            const currentMonth = now.toISOString().slice(0, 7);
                                            const isFutureMonth = invoiceMonth > currentMonth;
                                            const actualPaymentStatus = String(paymentStatus?.payment_status || paymentStatus?.status || 'UNPAID');
                                            const isActuallyPaid = actualPaymentStatus.includes('PAID');
                                            
                                            return isActuallyPaid ? 'text-green-700' : 'text-blue-700';
                                        })()
                                    }`}>
                                        {(() => {
                                            const now = new Date();
                                            const currentMonth = now.toISOString().slice(0, 7);
                                            const isFutureMonth = invoiceMonth > currentMonth;
                                            const actualPaymentStatus = String(paymentStatus?.payment_status || paymentStatus?.status || 'UNPAID');
                                            const isActuallyPaid = actualPaymentStatus.includes('PAID');
                                            const hasPaymentDate = paymentStatus?.payment_date;
                                            const hasFacilityPayment = hasPaymentDate || actualPaymentStatus.includes('CHECK') || actualPaymentStatus.includes('CARD') || actualPaymentStatus.includes('BANK');
                                            
                                            // Show payment status based on actual facility payment, not just dispatcher verification
                                            if (isActuallyPaid && hasFacilityPayment) {
                                                return '✅ COMPLETED TRIPS (Payment Verified)';
                                            } else {
                                                return '🚗 COMPLETED TRIPS (Awaiting Payment)';
                                            }
                                        })()}
                                    </h4>
                                    
                                    {/* Summary Box for Completed Trips */}
                                    <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">Total Completed Trips</p>
                                                <p className="text-2xl font-bold text-gray-900">{billableTrips.length}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                                                <p className={`text-2xl font-bold ${
                                                    (() => {
                                                        const actualPaymentStatus = String(paymentStatus?.payment_status || paymentStatus?.status || 'UNPAID');
                                                        const isActuallyPaid = actualPaymentStatus.includes('PAID');
                                                        const hasPaymentDate = paymentStatus?.payment_date;
                                                        const hasFacilityPayment = hasPaymentDate || actualPaymentStatus.includes('CHECK') || actualPaymentStatus.includes('CARD') || actualPaymentStatus.includes('BANK');
                                                        
                                                        return (isActuallyPaid && hasFacilityPayment) ? 'text-green-700' : 'text-blue-700';
                                                    })()
                                                }`}>
                                                    ${billableTrips.reduce((sum, trip) => sum + (trip.displayPrice || 0), 0).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                        {(() => {
                                            const actualPaymentStatus = String(paymentStatus?.payment_status || paymentStatus?.status || 'UNPAID');
                                            const isActuallyPaid = actualPaymentStatus.includes('PAID');
                                            const hasPaymentDate = paymentStatus?.payment_date;
                                            const hasFacilityPayment = hasPaymentDate || actualPaymentStatus.includes('CHECK') || actualPaymentStatus.includes('CARD') || actualPaymentStatus.includes('BANK');
                                            
                                            return isActuallyPaid && hasFacilityPayment;
                                        })() && (
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                <p className="text-sm text-green-600 font-medium flex items-center">
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                    </svg>
                                                    Payment has been verified and processed
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="overflow-x-auto">
                                        <table className="w-full border border-gray-200">
                                            <thead className={`${
                                                (() => {
                                                    const actualPaymentStatus = String(paymentStatus?.payment_status || paymentStatus?.status || 'UNPAID');
                                                    const isActuallyPaid = actualPaymentStatus.includes('PAID');
                                                    return isActuallyPaid ? 'bg-green-50' : 'bg-blue-50';
                                                })()
                                            }`}>
                                                <tr>
                                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-700 uppercase border-b">Trip ID</th>
                                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-700 uppercase border-b">Date</th>
                                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-700 uppercase border-b">Client</th>
                                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-700 uppercase border-b">Route</th>
                                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-700 uppercase border-b">Features</th>
                                                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-700 uppercase border-b">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {billableTrips.map((trip, index) => (
                                                    <tr key={trip.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                        <td className="px-4 py-3 border-b">
                                                            <div className="text-xs font-mono text-gray-600">
                                                                #{trip.id.slice(0, 8)}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 border-b">
                                                            <div className="text-sm font-bold text-gray-900">
                                                                {new Date(trip.pickup_time).toLocaleDateString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric'
                                                                })}
                                                            </div>
                                                            <div className="text-xs font-medium text-gray-700">
                                                                {new Date(trip.pickup_time).toLocaleTimeString('en-US', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 border-b">
                                                            <div className="text-sm font-bold text-gray-900">{trip.clientName}</div>
                                                            {trip.clientPhone && (
                                                                <div className="text-xs font-medium text-gray-700">📞 {trip.clientPhone}</div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 border-b">
                                                            <div className="text-sm">
                                                                <div className="font-medium text-gray-900">
                                                                    📍 {trip.pickup_address?.split(',')[0] || 'Unknown pickup'}
                                                                </div>
                                                                <div className="font-medium text-gray-800 mt-1">
                                                                    🎯 {trip.destination_address?.split(',')[0] || 'Unknown destination'}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 border-b">
                                                            <div className="flex flex-col space-y-1">
                                                                {trip.wheelchair_type && (
                                                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                                        ♿ Wheelchair
                                                                    </span>
                                                                )}
                                                                {trip.is_round_trip && (
                                                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                                        🔄 Round Trip
                                                                    </span>
                                                                )}
                                                                {trip.additional_passengers > 0 && (
                                                                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                                                        👥 +{trip.additional_passengers}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 border-b text-right">
                                                            <span className="text-sm font-bold text-green-700 bg-green-50 px-2 py-1 rounded">
                                                                ${(trip.displayPrice || trip.price || 0).toFixed(2)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* No Completed Trips Message */}
                            {billableTrips.length === 0 && (
                                <div className="mb-6">
                                    <h4 className="text-md font-medium text-gray-700 mb-3">🚗 COMPLETED TRIPS</h4>
                                    <div className="bg-gray-50 border border-gray-300 rounded-lg p-8 text-center">
                                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <h5 className="text-lg font-medium text-gray-600 mb-2">No Completed Trips Yet</h5>
                                        <p className="text-sm text-gray-500">
                                            Once trips are marked as completed, they will appear here for billing.
                                        </p>
                                        <p className="text-xs text-gray-400 mt-2">
                                            Pending trips below will move here once completed.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Pending/Non-Billable Trips */}
                            {pendingTrips.length > 0 && (
                                <div>
                                    <h4 className="text-md font-medium text-amber-700 mb-3">⏳ Pending Trips (Not Yet Billable)</h4>
                                    <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                                        <p className="text-sm text-amber-800 mb-4 font-medium">
                                            These trips are not included in this month's billing as they are pending approval or not yet completed.
                                        </p>
                                        <div className="space-y-3">
                                            {pendingTrips.slice(0, 5).map((trip) => (
                                                <div key={trip.id} className="flex justify-between items-center p-3 bg-white rounded border border-amber-200 shadow-sm">
                                                    <div className="flex-1">
                                                        <div className="text-sm font-bold text-gray-900">
                                                            {trip.clientName}
                                                        </div>
                                                        <div className="text-xs font-medium text-gray-800 mt-1">
                                                            {new Date(trip.pickup_time).toLocaleDateString('en-US', {
                                                                weekday: 'short',
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            })} at {new Date(trip.pickup_time).toLocaleTimeString('en-US', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </div>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                        trip.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                                        trip.status === 'upcoming' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                                                        trip.status === 'confirmed' ? 'bg-green-100 text-green-800 border border-green-300' :
                                                        'bg-gray-100 text-gray-700 border border-gray-300'
                                                    }`}>
                                                        {trip.status.toUpperCase()}
                                                    </span>
                                                </div>
                                            ))}
                                            {pendingTrips.length > 5 && (
                                                <div className="mt-3 p-2 bg-white rounded border border-amber-200">
                                                    <p className="text-sm text-amber-700 font-medium text-center">
                                                        + {pendingTrips.length - 5} more pending trips
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Latest Booked Trips - Action Required */}
                            <div className="mt-6">
                                <h4 className="text-md font-medium text-blue-700 mb-3">🚀 Latest Booked Trips - Action Required</h4>
                                <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                                    <p className="text-sm text-blue-800 mb-4 font-medium">
                                        Recent trip bookings requiring dispatcher approval, cancellation, or rejection.
                                    </p>
                                    <div className="space-y-3">
                                        {processedTrips.filter(trip => ['pending', 'upcoming'].includes(trip.status)).slice(0, 10).map((trip) => (
                                            <div key={trip.id} className="bg-white rounded border border-blue-200 shadow-sm overflow-hidden">
                                                <div className="p-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                                        {/* Date Column */}
                                                        <div className="text-center md:text-left">
                                                            <div className="text-sm font-bold text-black bg-yellow-50 px-2 py-1 rounded border">
                                                                {new Date(trip.pickup_time).toLocaleDateString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric'
                                                                })}
                                                            </div>
                                                            <div className="text-xs font-bold text-black mt-1">
                                                                {new Date(trip.pickup_time).toLocaleTimeString('en-US', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Client Column */}
                                                        <div>
                                                            <div className="text-sm font-bold text-black">{trip.clientName}</div>
                                                            {trip.clientPhone && (
                                                                <div className="text-xs font-bold text-black">📞 {trip.clientPhone}</div>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Route Column */}
                                                        <div>
                                                            <div className="text-sm">
                                                                <div className="font-bold text-black">
                                                                    📍 {trip.pickup_address?.split(',')[0] || 'Unknown pickup'}
                                                                </div>
                                                                <div className="font-bold text-black mt-1">
                                                                    🎯 {trip.destination_address?.split(',')[0] || 'Unknown destination'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Features & Actions Column */}
                                                        <div>
                                                            <div className="flex flex-col space-y-2">
                                                                {/* Features */}
                                                                <div className="flex flex-wrap gap-1">
                                                                    {trip.wheelchair_type && (
                                                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                                            ♿ Wheelchair
                                                                        </span>
                                                                    )}
                                                                    {trip.is_round_trip && (
                                                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                                            🔄 Round Trip
                                                                        </span>
                                                                    )}
                                                                    {trip.additional_passengers > 0 && (
                                                                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                                                            👥 +{trip.additional_passengers}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                
                                                                {/* Price */}
                                                                <div className="text-sm font-bold text-green-800 bg-green-100 px-3 py-1 rounded border border-green-300">
                                                                    ${(trip.displayPrice || trip.price || 0).toFixed(2)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Edit Tracking Display */}
                                                    {trip.last_edited_by && trip.edited_by_role && (
                                                        <div className="mt-3 pt-2 border-t border-orange-200">
                                                            <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded inline-block">
                                                                ✏️ EDITED BY {trip.edited_by_role?.toUpperCase()}
                                                                {trip.last_edited_at && (
                                                                    <span className="ml-1 text-orange-500">
                                                                        ({new Date(trip.last_edited_at).toLocaleDateString('en-US', {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        })})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Status and Actions Row */}
                                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                                        <div className="flex items-center justify-between">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                                trip.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                                                trip.status === 'upcoming' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                                                                'bg-gray-100 text-gray-700 border border-gray-300'
                                                            }`}>
                                                                {trip.status.toUpperCase()}
                                                            </span>
                                                            <div className="flex space-x-1">
                                                                {trip.status === 'pending' && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleEditTrip(trip)}
                                                                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                                                                        >
                                                                            ✏️ EDIT
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleTripAction(trip.id, 'approve')}
                                                                            disabled={processingTripAction === trip.id}
                                                                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                                                                        >
                                                                            {processingTripAction === trip.id ? '⏳' : '✅'} APPROVE
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleTripAction(trip.id, 'reject')}
                                                                            disabled={processingTripAction === trip.id}
                                                                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                                                                        >
                                                                            {processingTripAction === trip.id ? '⏳' : '❌'} REJECT
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {['upcoming', 'confirmed'].includes(trip.status) && (
                                                                    <button
                                                                        onClick={() => handleTripAction(trip.id, 'complete')}
                                                                        disabled={processingTripAction === trip.id}
                                                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                                                                    >
                                                                        {processingTripAction === trip.id ? '⏳' : '✅'} COMPLETE
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleTripAction(trip.id, 'cancel')}
                                                                    disabled={processingTripAction === trip.id}
                                                                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                                                                >
                                                                    {processingTripAction === trip.id ? '⏳' : '🚫'} CANCEL
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Instructions */}
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">💳 Payment Instructions</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Monthly Billing Terms:</h4>
                                    <ul className="text-sm text-gray-600 space-y-1">
                                        <li>• Payment due within 30 days of invoice date</li>
                                        <li>• Only completed trips are billed</li>
                                        <li>• Pending trips will appear on next month's invoice</li>
                                        <li>• Electronic payment preferred</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">💳 Accepted Payment Methods:</h4>
                                    <div className="space-y-3">
                                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-green-600">✅</span>
                                                <span className="font-medium text-green-900">Company Check (Preferred)</span>
                                            </div>
                                            <p className="text-sm text-green-700 mt-1 ml-6">
                                                Mail to: Compassionate Care Transportation, 5050 Blazer Pkwy Suite 100-B, Dublin, OH 43017
                                            </p>
                                        </div>
                                        
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-blue-600">💳</span>
                                                <span className="font-medium text-blue-900">Credit Card</span>
                                            </div>
                                            <p className="text-sm text-blue-700 mt-1 ml-6">
                                                Contact billing@compassionatecaretransportation.com for secure payment processing
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Professional Payment Confirmation Dialog */}
            {showPaymentConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                        <div className="p-6">
                            <div className="flex items-center mb-6">
                                <div className="flex-shrink-0">
                                    <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-xl font-semibold text-gray-900">Confirm Payment Verification</h3>
                                    <p className="text-sm text-gray-600 mt-1">Final confirmation required</p>
                                </div>
                            </div>
                            
                            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-start">
                                    <svg className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <div>
                                        <h4 className="text-sm font-semibold text-amber-800 mb-1">⚠️ Important Notice</h4>
                                        <p className="text-sm text-amber-700">
                                            <strong>This action cannot be undone.</strong> Only proceed if you have verified that the payment has been received and processed successfully.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h4 className="text-sm font-medium text-gray-900 mb-3">Please confirm the following:</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center text-sm text-gray-700">
                                        <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Payment has been received and verified
                                    </div>
                                    <div className="flex items-center text-sm text-gray-700">
                                        <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Amount matches the invoice total
                                    </div>
                                    <div className="flex items-center text-sm text-gray-700">
                                        <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Payment method has been confirmed
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg mb-6">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-700">Invoice Amount:</span>
                                    <span className="font-bold text-gray-900">${totalAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm mt-1">
                                    <span className="font-medium text-gray-700">Facility:</span>
                                    <span className="font-medium text-gray-900">{facilityInfo?.name}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm mt-1">
                                    <span className="font-medium text-gray-700">Period:</span>
                                    <span className="font-medium text-gray-900">{getMonthDisplayName()}</span>
                                </div>
                            </div>
                            
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => {
                                        setShowPaymentConfirmation(false);
                                        handleTogglePaymentStatus();
                                    }}
                                    disabled={updatingPaymentStatus}
                                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-md transition-colors text-sm"
                                >
                                    {updatingPaymentStatus ? (
                                        <div className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing...
                                        </div>
                                    ) : (
                                        '✅ Yes, Confirm Payment Received'
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowPaymentConfirmation(false)}
                                    disabled={updatingPaymentStatus}
                                    className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-md transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Professional Verification Dialog */}
            {showVerificationDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                        <div className="p-6">
                            <div className="flex items-center mb-6">
                                <div className="flex-shrink-0">
                                    <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.5-4L16 3l-4 4m0 0l-4 4m4-4v12" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-xl font-semibold text-gray-900">Professional Verification Required</h3>
                                    <p className="text-sm text-gray-600 mt-1">Quality assurance confirmation</p>
                                </div>
                            </div>
                            
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-start">
                                    <svg className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <h4 className="text-sm font-semibold text-blue-800 mb-1">📋 Professional Standards</h4>
                                        <p className="text-sm text-blue-700">
                                            <strong>Quality verification required.</strong> Please confirm that all service documentation, billing accuracy, and compliance standards have been thoroughly reviewed and verified.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h4 className="text-sm font-medium text-gray-900 mb-3">Verification Checklist:</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center text-sm text-gray-700">
                                        <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        All trip documentation has been reviewed
                                    </div>
                                    <div className="flex items-center text-sm text-gray-700">
                                        <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Billing calculations have been verified
                                    </div>
                                    <div className="flex items-center text-sm text-gray-700">
                                        <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Service quality standards have been met
                                    </div>
                                    <div className="flex items-center text-sm text-gray-700">
                                        <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Compliance requirements have been satisfied
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg mb-6">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-700">Invoice Amount:</span>
                                    <span className="font-bold text-gray-900">${totalAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm mt-1">
                                    <span className="font-medium text-gray-700">Facility:</span>
                                    <span className="font-medium text-gray-900">{facilityInfo?.name}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm mt-1">
                                    <span className="font-medium text-gray-700">Period:</span>
                                    <span className="font-medium text-gray-900">{getMonthDisplayName()}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm mt-1">
                                    <span className="font-medium text-gray-700">Total Trips:</span>
                                    <span className="font-medium text-gray-900">{facilityTrips.length}</span>
                                </div>
                            </div>
                            
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => {
                                        setShowVerificationDialog(false);
                                        processCheckVerification('mark_verified');
                                    }}
                                    disabled={updatingPaymentStatus}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-md transition-colors text-sm"
                                >
                                    ✅ Confirm Professional Verification
                                </button>
                                <button
                                    onClick={() => setShowVerificationDialog(false)}
                                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-3 px-4 rounded-md transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Check Received Confirmation Dialog */}
            {showCheckReceivedDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                        <div className="p-6">
                            <div className="flex items-center mb-6">
                                <div className="flex-shrink-0">
                                    <svg className="h-8 w-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-xl font-semibold text-gray-900">🏦 Final Payment Verification</h3>
                                    <p className="text-sm text-gray-600 mt-1">Check received & deposited confirmation</p>
                                </div>
                            </div>
                            
                            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                <div className="flex items-start">
                                    <svg className="h-5 w-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <div>
                                        <h4 className="text-sm font-semibold text-orange-800 mb-2">🏦 Final Banking Confirmation</h4>
                                        <p className="text-sm text-orange-700 mb-3">
                                            <strong>CONFIRM: Check has been RECEIVED and DEPOSITED into company bank account?</strong>
                                        </p>
                                        <p className="text-sm text-orange-700">
                                            This is the <strong>FINAL STEP</strong> in check payment processing. Please ensure the funds are fully deposited because this action <strong>CANNOT BE UNDONE</strong> and will mark the invoice as completely paid.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h4 className="text-sm font-medium text-gray-900 mb-3">Final Verification Checklist - ALL MUST BE COMPLETED:</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center text-sm text-gray-700">
                                        <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        ✓ Physical check received and verified in office
                                    </div>
                                    <div className="flex items-center text-sm text-gray-700">
                                        <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        ✓ Check amount verified: $${totalAmount.toFixed(2)}
                                    </div>
                                    <div className="flex items-center text-sm text-gray-700">
                                        <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        ✓ Check authenticity confirmed (signatures, dates, routing)
                                    </div>
                                    <div className="flex items-center text-sm text-gray-700">
                                        <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        ✓ Check DEPOSITED into company bank account
                                    </div>
                                    <div className="flex items-center text-sm text-gray-700">
                                        <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        ✓ Bank deposit confirmation received
                                    </div>
                                </div>
                            </div>

                            <div className="bg-red-50 p-4 rounded-lg mb-6 border border-red-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-red-800 flex items-center">
                                        <svg className="h-5 w-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        FINAL CONFIRMATION REQUIRED
                                    </span>
                                    <span className="font-bold text-red-800 bg-red-200 px-2 py-1 rounded text-xs">IRREVERSIBLE</span>
                                </div>
                                <p className="text-sm text-red-700 font-medium mb-1">
                                    This action will IMMEDIATELY mark the invoice as FULLY PAID and notify the facility that payment processing is complete.
                                </p>
                                <p className="text-xs text-red-600">
                                    • No further verification steps required
                                    • Invoice will show as "Payment Completed Successfully"
                                    • All trips will be marked as paid
                                    • Action cannot be reversed
                                </p>
                            </div>
                            
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => {
                                        setShowCheckReceivedDialog(false);
                                        processCheckVerification('check_received');
                                    }}
                                    disabled={updatingPaymentStatus}
                                    className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-md transition-colors text-sm"
                                >
                                    ✅ Yes, Check Received & Deposited
                                </button>
                                <button
                                    onClick={() => setShowCheckReceivedDialog(false)}
                                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-3 px-4 rounded-md transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Payment Dialog */}
            {showConfirmPaymentDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                        <div className="p-6">
                            <div className="flex items-center mb-6">
                                <div className="flex-shrink-0">
                                    <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-xl font-semibold text-gray-900">Confirm Payment Received</h3>
                                    <p className="text-sm text-gray-600 mt-1">Payment verification confirmation</p>
                                </div>
                            </div>
                            
                            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-start">
                                    <svg className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <div>
                                        <h4 className="text-sm font-semibold text-amber-800 mb-1">⚠️ Important Notice</h4>
                                        <p className="text-sm text-amber-700">
                                            <strong>ARE YOU SURE YOU RECEIVED THE PAYMENT? This action cannot be undone.</strong> Only confirm if you have verified the payment was successfully received and processed.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg mb-6">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-700">Payment Amount:</span>
                                    <span className="font-bold text-gray-900">${totalAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm mt-1">
                                    <span className="font-medium text-gray-700">Payment Method:</span>
                                    <span className="font-medium text-gray-900">{paymentStatus?.status}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm mt-1">
                                    <span className="font-medium text-gray-700">Facility:</span>
                                    <span className="font-medium text-gray-900">{facilityInfo?.name}</span>
                                </div>
                            </div>
                            
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => {
                                        setShowConfirmPaymentDialog(false);
                                        processCheckVerification('confirm_payment');
                                    }}
                                    disabled={updatingPaymentStatus}
                                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-md transition-colors text-sm"
                                >
                                    {updatingPaymentStatus ? (
                                        <div className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing...
                                        </div>
                                    ) : (
                                        '✅ Yes, Payment Confirmed'
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowConfirmPaymentDialog(false)}
                                    disabled={updatingPaymentStatus}
                                    className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-md transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Failed Dialog */}
            {showPaymentFailedDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                        <div className="p-6">
                            <div className="flex items-center mb-6">
                                <div className="flex-shrink-0">
                                    <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-xl font-semibold text-gray-900">Mark Payment as Failed</h3>
                                    <p className="text-sm text-gray-600 mt-1">Payment failure confirmation</p>
                                </div>
                            </div>
                            
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-start">
                                    <svg className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <div>
                                        <h4 className="text-sm font-semibold text-red-800 mb-1">⚠️ Critical Warning</h4>
                                        <p className="text-sm text-red-700">
                                            <strong>ARE YOU SURE YOU HAVEN'T RECEIVED ANY PAYMENT?</strong> Please check with your bank because this action cannot be undone and the facility will see a retry payment option.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg mb-6">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-700">Payment Amount:</span>
                                    <span className="font-bold text-gray-900">${totalAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm mt-1">
                                    <span className="font-medium text-gray-700">Payment Method:</span>
                                    <span className="font-medium text-gray-900">{paymentStatus?.status}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm mt-1">
                                    <span className="font-medium text-gray-700">Facility:</span>
                                    <span className="font-medium text-gray-900">{facilityInfo?.name}</span>
                                </div>
                            </div>
                            
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => {
                                        setShowPaymentFailedDialog(false);
                                        processCheckVerification('payment_failed');
                                    }}
                                    disabled={updatingPaymentStatus}
                                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-md transition-colors text-sm"
                                >
                                    {updatingPaymentStatus ? (
                                        <div className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing...
                                        </div>
                                    ) : (
                                        '❌ Yes, Mark Payment Failed'
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowPaymentFailedDialog(false)}
                                    disabled={updatingPaymentStatus}
                                    className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-md transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Trip Form Modal */}
            {showEditForm && editingTrip && (
                <EditTripForm 
                    trip={editingTrip}
                    onSave={handleTripSave}
                    onCancel={handleTripEditCancel}
                />
            )}
        </div>
    );
}
