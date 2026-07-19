-- Full refunds issued from the admin panel get their own terminal status, so a
-- later `syncPayments` can tell them apart from a live CAPTURED order.
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';
