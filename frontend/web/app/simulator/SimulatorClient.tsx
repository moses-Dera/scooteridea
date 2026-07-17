'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useFleetSocket } from '@/hooks/useFleetSocket';
import {
  Battery,
  BatteryCharging,
  BatteryWarning,
  Cpu,
  Navigation,
  MapPin,
  Zap,
  Lock,
  Unlock,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
