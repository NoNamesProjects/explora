import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AdminBootSplash } from '@/components/admin/AdminBootSplash';

const AdminRoot = lazy(() => import('@/routes/admin/AdminRoot'));
const Home = lazy(() => import('@/routes/Home'));
const Destinations = lazy(() => import('@/routes/Destinations'));
const DestinationRegion = lazy(() => import('@/routes/DestinationRegion'));
const JourneyDetail = lazy(() => import('@/routes/JourneyDetail'));
const ShipDetail = lazy(() => import('@/routes/ShipDetail'));
const Ships = lazy(() => import('@/routes/Ships'));
const SuiteCategory = lazy(() => import('@/routes/SuiteCategory'));
const Experience = lazy(() => import('@/routes/Experience'));
const FindAJourney = lazy(() => import('@/routes/FindAJourney'));
const About = lazy(() => import('@/routes/About'));
const Contact = lazy(() => import('@/routes/Contact'));
const FAQ = lazy(() => import('@/routes/FAQ'));
const Legal = lazy(() => import('@/routes/Legal'));
const NotFound = lazy(() => import('@/routes/NotFound'));
const BookingLayout = lazy(() => import('@/components/booking/BookingLayout').then((m) => ({ default: m.BookingLayout })));
const PassengersStep = lazy(() => import('@/components/booking/PassengersStep').then((m) => ({ default: m.PassengersStep })));
const SuiteFareStep = lazy(() => import('@/components/booking/SuiteFareStep').then((m) => ({ default: m.SuiteFareStep })));
const GuestDetailsStep = lazy(() => import('@/components/booking/GuestDetailsStep').then((m) => ({ default: m.GuestDetailsStep })));
const ReviewStep = lazy(() => import('@/components/booking/ReviewStep').then((m) => ({ default: m.ReviewStep })));
const ConfirmationStep = lazy(() => import('@/components/booking/ConfirmationStep').then((m) => ({ default: m.ConfirmationStep })));

export default function App() {
  return (
    <Routes>
      {/* Public marketing site — shared chrome via PublicLayout. */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/destinations" element={<Destinations />} />
        <Route path="/destinations/:region" element={<DestinationRegion />} />
        <Route path="/destinations/:region/journeys/:id" element={<JourneyDetail />} />
        <Route path="/journeys/:id" element={<JourneyDetail />} />
        <Route path="/journeys/:id/book" element={<BookingLayout />}>
          <Route index element={<Navigate to="guests" replace />} />
          <Route path="guests" element={<PassengersStep />} />
          <Route path="suite" element={<SuiteFareStep />} />
          <Route path="details" element={<GuestDetailsStep />} />
          <Route path="review" element={<ReviewStep />} />
          <Route path="confirmation/:ref" element={<ConfirmationStep />} />
        </Route>
        <Route path="/ships" element={<Ships />} />
        <Route path="/ships/:code" element={<ShipDetail />} />
        <Route path="/suites/:category" element={<SuiteCategory />} />
        <Route path="/experience/:topic" element={<Experience />} />
        <Route path="/find-your-journey" element={<FindAJourney />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/legal/:doc" element={<Legal />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin / operations console — its own chrome-less lazy chunk. */}
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<AdminBootSplash />}>
            <AdminRoot />
          </Suspense>
        }
      />
    </Routes>
  );
}
