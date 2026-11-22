import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull().default('VS Fleet Member'),
  phone: text('phone').notNull().default(''),
  company: text('company').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderCode: text('order_code').notNull().unique(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  status: text('status').notNull().default('Confirmed'),
  subtotal: integer('subtotal').notNull(),
  discount: integer('discount').notNull().default(0),
  gst: integer('gst').notNull().default(0),
  shipping: integer('shipping').notNull().default(0),
  total: integer('total').notNull(),
  customerName: text('customer_name').notNull(),
  shippingAddress: text('shipping_address').notNull(),
  city: text('city').notNull(),
  paymentMethod: text('payment_method').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  productId: text('product_id').notNull(),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
  plan: text('plan').notNull(),
});

export const warranties = pgTable('warranties', {
  id: serial('id').primaryKey(),
  warrantyCode: text('warranty_code').notNull().unique(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  imei: text('imei').notNull(),
  productName: text('product_name').notNull(),
  purchaseDate: text('purchase_date').notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  status: text('status').notNull().default('Active'),
  expiresOn: text('expires_on').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const installationBookings = pgTable('installation_bookings', {
  id: serial('id').primaryKey(),
  bookingCode: text('booking_code').notNull().unique(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  vehicleType: text('vehicle_type').notNull(),
  city: text('city').notNull(),
  scheduledDate: text('scheduled_date').notNull(),
  timeSlot: text('time_slot').notNull(),
  customerName: text('customer_name').notNull(),
  phone: text('phone').notNull(),
  status: text('status').notNull().default('Scheduled'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const demoRequests = pgTable('demo_requests', {
  id: serial('id').primaryKey(),
  requestCode: text('request_code').notNull().unique(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  company: text('company').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  fleetSize: text('fleet_size').notNull(),
  interest: text('interest').notNull(),
  preferredDate: text('preferred_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  warranties: many(warranties),
  installationBookings: many(installationBookings),
  demoRequests: many(demoRequests),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));

export const warrantiesRelations = relations(warranties, ({ one }) => ({
  user: one(users, {
    fields: [warranties.userId],
    references: [users.id],
  }),
}));

export const installationBookingsRelations = relations(installationBookings, ({ one }) => ({
  user: one(users, {
    fields: [installationBookings.userId],
    references: [users.id],
  }),
}));

export const demoRequestsRelations = relations(demoRequests, ({ one }) => ({
  user: one(users, {
    fields: [demoRequests.userId],
    references: [users.id],
  }),
}));
