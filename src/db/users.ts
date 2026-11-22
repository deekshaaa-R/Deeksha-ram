import { desc, eq, inArray } from 'drizzle-orm';
import { db } from './index.ts';
import {
  demoRequests,
  installationBookings,
  orderItems,
  orders,
  users,
  warranties,
} from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string,
  phone?: string,
  company?: string
) {
  try {
    const safeName = (displayName || email.split('@')[0] || 'VS Member').slice(0, 100);
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: safeName,
        phone: (phone || '').slice(0, 32),
        company: (company || '').slice(0, 120),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(displayName ? { displayName: safeName } : {}),
          ...(phone !== undefined ? { phone: phone.slice(0, 32) } : {}),
          ...(company !== undefined ? { company: company.slice(0, 120) } : {}),
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Failed to upsert user:', error);
    throw new Error('Unable to synchronize account profile.', { cause: error });
  }
}

export async function getUserAccountSnapshot(uid: string) {
  try {
    const [userRow] = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!userRow) {
      return { user: null, orders: [], warranties: [], bookings: [], demoRequests: [] };
    }

    const [userOrders, userWarranties, userBookings, userDemos] = await Promise.all([
      db.select().from(orders).where(eq(orders.userId, userRow.id)).orderBy(desc(orders.createdAt)),
      db.select().from(warranties).where(eq(warranties.userId, userRow.id)).orderBy(desc(warranties.createdAt)),
      db.select().from(installationBookings).where(eq(installationBookings.userId, userRow.id)).orderBy(desc(installationBookings.createdAt)),
      db.select().from(demoRequests).where(eq(demoRequests.userId, userRow.id)).orderBy(desc(demoRequests.createdAt)),
    ]);

    const orderIds = userOrders.map((o) => o.id);
    const itemRows = orderIds.length
      ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
      : [];

    const hydratedOrders = userOrders.map((order) => ({
      id: order.orderCode,
      date: (order.createdAt ?? new Date()).toISOString().slice(0, 10),
      status: (order.status as 'Confirmed' | 'Shipped' | 'Delivered') ?? 'Confirmed',
      items: itemRows
        .filter((item) => item.orderId === order.id)
        .map((item) => ({
          productId: item.productId,
          name: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          plan: item.plan,
        })),
      subtotal: order.subtotal,
      discount: order.discount,
      gst: order.gst,
      shipping: order.shipping,
      total: order.total,
      customerName: order.customerName,
      shippingAddress: order.shippingAddress,
      city: order.city,
      paymentMethod: order.paymentMethod,
    }));

    return {
      user: userRow,
      orders: hydratedOrders,
      warranties: userWarranties.map((w) => ({
        id: w.warrantyCode,
        imei: w.imei,
        productName: w.productName,
        purchaseDate: w.purchaseDate,
        invoiceNumber: w.invoiceNumber,
        status: (w.status as 'Active' | 'Pending Verification') ?? 'Active',
        expiresOn: w.expiresOn,
      })),
      bookings: userBookings.map((b) => ({
        id: b.bookingCode,
        vehicleType: b.vehicleType,
        city: b.city,
        date: b.scheduledDate,
        timeSlot: b.timeSlot,
        customerName: b.customerName,
        phone: b.phone,
        status: (b.status as 'Scheduled' | 'Completed') ?? 'Scheduled',
      })),
      demoRequests: userDemos.map((d) => ({
        id: d.requestCode,
        name: d.name,
        company: d.company,
        email: d.email,
        phone: d.phone,
        fleetSize: d.fleetSize,
        interest: d.interest,
        preferredDate: d.preferredDate,
        createdAt: (d.createdAt ?? new Date()).toISOString().slice(0, 10),
      })),
    };
  } catch (error) {
    console.error('Failed to fetch user account snapshot:', error);
    throw new Error('Unable to load account records from database.', { cause: error });
  }
}

export async function createOrderRecord(
  userId: number,
  input: {
    orderCode: string;
    subtotal: number;
    discount: number;
    gst: number;
    shipping: number;
    total: number;
    customerName: string;
    shippingAddress: string;
    city: string;
    paymentMethod: string;
    items: Array<{
      productId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      plan: string;
    }>;
  }
) {
  try {
    return await db.transaction(async (tx) => {
      const [insertedOrder] = await tx
        .insert(orders)
        .values({
          orderCode: input.orderCode,
          userId,
          status: 'Confirmed',
          subtotal: input.subtotal,
          discount: input.discount,
          gst: input.gst,
          shipping: input.shipping,
          total: input.total,
          customerName: input.customerName.slice(0, 120),
          shippingAddress: input.shippingAddress.slice(0, 280),
          city: input.city.slice(0, 80),
          paymentMethod: input.paymentMethod.slice(0, 64),
        })
        .returning();

      if (input.items.length > 0) {
        await tx.insert(orderItems).values(
          input.items.map((item) => ({
            orderId: insertedOrder.id,
            productId: item.productId,
            productName: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            plan: item.plan,
          }))
        );
      }

      return insertedOrder;
    });
  } catch (error) {
    console.error('Failed to create order record:', error);
    throw new Error('Unable to persist order in database.', { cause: error });
  }
}

export async function createWarrantyRecord(
  userId: number,
  input: {
    warrantyCode: string;
    imei: string;
    productName: string;
    purchaseDate: string;
    invoiceNumber: string;
    expiresOn: string;
  }
) {
  try {
    const [created] = await db
      .insert(warranties)
      .values({
        warrantyCode: input.warrantyCode,
        userId,
        imei: input.imei.slice(0, 32),
        productName: input.productName.slice(0, 120),
        purchaseDate: input.purchaseDate.slice(0, 20),
        invoiceNumber: input.invoiceNumber.slice(0, 64),
        status: 'Active',
        expiresOn: input.expiresOn.slice(0, 20),
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Failed to register warranty record:', error);
    throw new Error('Unable to register hardware warranty.', { cause: error });
  }
}

export async function createBookingRecord(
  userId: number,
  input: {
    bookingCode: string;
    vehicleType: string;
    city: string;
    date: string;
    timeSlot: string;
    customerName: string;
    phone: string;
  }
) {
  try {
    const [created] = await db
      .insert(installationBookings)
      .values({
        bookingCode: input.bookingCode,
        userId,
        vehicleType: input.vehicleType.slice(0, 80),
        city: input.city.slice(0, 80),
        scheduledDate: input.date.slice(0, 20),
        timeSlot: input.timeSlot.slice(0, 60),
        customerName: input.customerName.slice(0, 120),
        phone: input.phone.slice(0, 32),
        status: 'Scheduled',
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Failed to book installation record:', error);
    throw new Error('Unable to schedule installation.', { cause: error });
  }
}

export async function createDemoRequestRecord(
  userId: number | null,
  input: {
    requestCode: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    fleetSize: string;
    interest: string;
    preferredDate: string;
  }
) {
  try {
    const [created] = await db
      .insert(demoRequests)
      .values({
        requestCode: input.requestCode,
        userId,
        name: input.name.slice(0, 120),
        company: input.company.slice(0, 120),
        email: input.email.slice(0, 160),
        phone: input.phone.slice(0, 32),
        fleetSize: input.fleetSize.slice(0, 64),
        interest: input.interest.slice(0, 120),
        preferredDate: input.preferredDate.slice(0, 20),
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Failed to create demo request record:', error);
    throw new Error('Unable to save demo request.', { cause: error });
  }
}
