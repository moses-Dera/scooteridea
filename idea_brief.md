# How Our E-Bike Sharing Platform Works
### A Non-Technical Overview for Stakeholders

---

## The Big Picture

We are building a **smart, app-driven e-bike sharing platform** — think Uber, but for electric bicycles.

Riders open our app, find a nearby bike on a live map, unlock it with their phone, ride to their destination, return the bike to a physical docking stand, and pay automatically when the trip ends. Everything — from finding the bike to charging it for the next user — happens through our software, with no staff involvement needed at the point of service.

This document explains, in plain terms, how the core systems of the platform work together.

---

## 1. How the Bikes Connect to Our Platform

Every e-bike in our fleet comes fitted with a small onboard computer — think of it as the bike's brain. This device has two jobs: it knows exactly where the bike is at all times using GPS, and it connects directly to our servers over the same 4G mobile network your smartphone uses.

This means every bike in our fleet is essentially a smart, always-connected device — just like a smartphone, but mounted on a bicycle. The bike doesn't need a rider nearby to be tracked. It reports its own location, battery level, and status to our servers automatically, every few seconds, around the clock.

This is the foundation of the entire platform. Because every bike is independently connected to our servers, we can see the entire fleet in real time, send commands to individual bikes remotely, and know instantly if something is wrong.

---

## 2. How We Track Every Bike in Real Time

Every three to five seconds, each bike sends its GPS coordinates directly to our servers. Our system is built to handle this continuous stream of data from potentially thousands of bikes simultaneously — without slowing down or crashing.

To achieve this speed, we use a technology called **in-memory data storage** (similar to how a computer's RAM works, as opposed to a traditional hard drive). Location data is stored here because it can be read thousands of times per second. This is what allows a rider to open our app and see every nearby bike moving on a live map, smoothly and without delay — the same way you would watch a live sports broadcast.

All of this location history is also saved to a permanent database for analytics, audits, and dispute resolution.

---

## 3. Our Docking Stations — Where Bikes Live and Charge

Across the city, we install **physical docking stands** at high-traffic locations — transport terminals, office districts, universities, and shopping areas. These are not just parking spots. Each stand is an intelligent piece of infrastructure:

- When a bike is rolled into a slot, it is automatically locked in place by a mechanical cradle.
- A charging connector immediately begins replenishing the battery — no cables to plug in, no staff required.
- A built-in sensor identifies exactly which bike is in which slot and reports this to our servers in real time.

Every docking station is connected to our platform over 4G, just like the bikes themselves. Our operations team can see — from a single dashboard — how many slots are available at every stand across the city, which bikes are charging, and which stations are nearly full and need a fleet rebalancing visit.

**How bikes guide riders to stands:**  
Throughout every ride, the bike's own display screen shows the rider the name and distance of the nearest available docking station — and this updates continuously as they move. The rider's app mirrors this information on the map, showing all nearby stands colour-coded by how many free slots remain. When the rider is ready to end their trip, the app navigates them directly to the closest stand with a free space. The billing cycle stops the moment the bike is confirmed as docked and charging.

This system ensures bikes are always returned to a known location, always charged and ready for the next rider, and never abandoned in inconvenient places.

---

## 4. How the Rider App Works

A rider's experience is simple by design. They open our app, and a live map loads showing every available bike nearby, as well as all nearby docking stations — each one showing how many free slots it currently has. As bikes move in real time, the map updates automatically.

This smooth, live experience is powered by a technology called **WebSockets**. Rather than the app constantly asking our server "where are the bikes now?" every few seconds (which is slow, drains the phone's battery, and costs more to run), WebSockets work like a phone call that stays open. Our server simply speaks whenever there is new information, and the app listens. The result is a live, fluid map experience that is efficient for both the rider and for us.

When the rider selects a bike, they can see its battery level, an estimated ride cost, and the nearest available docking stand for when they finish. The whole process from opening the app to starting a ride is designed to take under 30 seconds.

---

## 5. How a Bike Gets Unlocked

Unlocking is the most important moment in the product experience, and we have built multiple ways to do it to ensure it works reliably.

The most common method works like this: the rider taps "Unlock" in the app. That request travels to our servers, which verify that the rider has a valid payment method and is physically close enough to the bike. Our server then sends a wireless command — over the mobile network — directly to the bike, instructing it to disengage its electronic lock and activate the motor. The whole process takes about two seconds.

We also support unlocking by scanning a QR code on the bike, tapping a smartphone to the bike using NFC (the same technology behind contactless card payments), and entering a one-time security code that the app generates and the rider types into the bike's display. These options give us redundancy, so if one method is unavailable, riders always have an alternative.

The moment the bike unlocks, the clock starts and the billing cycle begins. It stops automatically when the bike is docked and locked back into a stand.

---

## 6. How Rides Are Priced Dynamically

Pricing on our platform is not fixed. It responds to supply and demand automatically — similar to how airline ticket prices or hotel rooms go up during peak periods.

Our system divides the city into a grid of small digital zones. Every 60 seconds, the platform automatically checks how many bikes are available in each zone versus how many riders are requesting rides. If demand is significantly higher than supply in a given area, the system applies a small price increase in that zone to balance things out. This increase is always shown to the rider clearly before they confirm a booking — there are no surprises.

This dynamic approach serves two goals: it maximises revenue during peak hours, and it naturally incentivises riders to choose available bikes in nearby zones, distributing demand more evenly across the fleet.

---

## 7. How We Keep Riders and Assets Safe

Because every bike is connected to our platform at all times, we have a level of visibility and control that a traditional bike rental business simply cannot achieve.

**Geofencing** — We draw invisible digital boundaries on our map defining where bikes can and cannot be used. If a rider takes a bike outside an approved zone, our system detects this instantly. We can automatically send them a notification directing them back, reduce the bike's speed, or charge an out-of-zone fee — all without any staff intervention.

**Route monitoring** — During an active ride, our platform continuously compares the bike's real-time location to the most logical route for the trip. If the bike deviates significantly — suggesting misuse, an accident, or theft — the system flags the trip automatically and can alert our operations team.

**Remote control** — If a bike is reported stolen or is behaving abnormally, our team can remotely lock the bike, disable its motor, or activate an alarm — all from a computer, regardless of where the bike is.

**Anti-theft** — If a bike goes offline unexpectedly during an active ride, or if its GPS position jumps in a way that is physically impossible, the system immediately raises an alert to our operations team.

---

## 8. The Matching Engine — How Riders Find the Right Bike

Behind the scenes, when a rider requests a bike, our platform does not simply show them the nearest one. It runs an intelligent calculation that considers distance, the bike's battery level, estimated travel time, and how close the bike is to a docking station — ensuring the rider is matched to a bike they can easily return at the end of their journey.

This engine works by first finding all available bikes within a 2-kilometre radius almost instantly (under 10 milliseconds), then ranking them by a combination of those factors, and reserving the best match for that specific rider.

As the platform matures, we plan to introduce an AI-powered version of this matching engine. Rather than following a fixed set of rules, it learns from real usage patterns over time — getting progressively smarter at predicting exactly when and where to make matches. Early industry data suggests this can reduce rider wait times by up to 30%.

---

## 9. The Optional Future: Blockchain-Based Payments

While we will launch with standard payment processing (the same technology behind every major app), our platform architecture is designed with the option to integrate blockchain-based payments in the future.

In practical terms, this means rides could be paid for through digital wallets, with the fare automatically held in a neutral account at the start of a ride and instantly released to us the moment the ride ends — with no bank or payment processor taking a percentage fee in between.

Transaction fees on the Solana blockchain, which we are evaluating, are a fraction of a cent — compared to approximately 3% per transaction on traditional card payments. At scale, this represents a meaningful reduction in operating costs.

This is not a Day One feature. It is a strategic option we are building toward as the market matures.

---

## Summary: How It All Fits Together

| What Happens | How We Achieve It |
|---|---|
| Bikes are always tracked | 4G-connected onboard computer sends GPS every 3–5 seconds |
| Riders see live bikes and stands on a map | Real-time connection between our server and the app |
| Booking and unlocking is instant | Wireless command from server to the bike's electronic lock |
| Bikes are automatically charged | Docking stations charge bikes the moment they are returned |
| Riders are guided to the nearest stand | Bike display and app show nearest available dock in real time |
| Pricing reflects demand | Automated surge pricing recalculated every 60 seconds |
| Bikes stay where they should | Digital geofences with automatic enforcement |
| Assets are protected | Remote lock, alarm, and disable capabilities at all times |
| The platform grows smarter | AI matching engine learns from usage data over time |

---

## What This Means for the Business

- **No staff required at the point of service.** The entire rider journey — finding, unlocking, riding, returning, and paying — is fully automated.
- **The fleet charges itself.** Every bike returned to a stand is automatically charged and ready for the next rider, with no manual handling required.
- **Operations team stays in control.** A single dashboard shows every bike, every stand, and every charging slot across the entire city in real time — with automatic alerts when rebalancing is needed.
- **Revenue is maximised automatically.** Dynamic pricing ensures we capture higher value during peak demand without manual intervention.
- **The platform is built to scale.** The architecture supports growing from 50 bikes and 5 stands to 50,000 bikes and 500 stands without rebuilding the system — only expanding the infrastructure.

This is not a product we are building from scratch as we go. It is a well-established architecture, proven at scale by companies like Lime, Bird, and Bolt — and we are building it with the same engineering principles from day one.
