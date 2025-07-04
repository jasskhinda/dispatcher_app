-- Complete Check Payment Status Database Schema Update
-- This schema adds ALL check payment statuses used by the dispatcher app
-- Safe to run multiple times

-- Update facility_invoices payment_status enum to include ALL check payment statuses
ALTER TABLE facility_invoices 
DROP CONSTRAINT IF EXISTS facility_invoices_payment_status_check;

ALTER TABLE facility_invoices 
ADD CONSTRAINT facility_invoices_payment_status_check 
CHECK (payment_status IN (
    'UNPAID',                              -- Initial state
    'PROCESSING PAYMENT',                  -- Check payment submitted, processing
    'PAID',                               -- Credit card/bank transfer completed
    'PAID WITH CARD',                     -- Credit/debit card payment completed
    'PAID WITH BANK TRANSFER',            -- Bank transfer payment completed
    'PAID WITH CHECK (BEING VERIFIED)',   -- Check received, pending verification
    'PAID WITH CHECK - VERIFIED',         -- Final verified check payment state
    'PENDING',                            -- Status reset to pending (retry payment)
    'NEEDS ATTENTION - RETRY PAYMENT',    -- Requires attention from facility
    
    -- Additional detailed check payment statuses used by dispatcher
    'CHECK PAYMENT - WILL MAIL',          -- Facility indicated they will mail check
    'CHECK PAYMENT - ALREADY SENT',       -- Facility indicated check was already mailed
    'CHECK PAYMENT - IN TRANSIT',         -- Check is in transit to office
    'CHECK PAYMENT - BEING VERIFIED',     -- Check is being verified by dispatcher
    'CHECK PAYMENT - HAS ISSUES',         -- Check has issues that need resolution
    'CHECK PAYMENT - REPLACEMENT REQUESTED', -- New check requested due to issues
    'CHECK PAYMENT - NOT RECEIVED',       -- Check marked as not received
    'UPCOMING INVOICE'                    -- Future invoice not yet due
));

-- Note: This should be run on both facility_app and dispatcher_app databases