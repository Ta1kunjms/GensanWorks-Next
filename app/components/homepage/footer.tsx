"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, Phone } from "lucide-react";

interface GeneralSettings {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
}

interface FooterProps {
  generalSettings?: GeneralSettings;
}

const defaultSettings: GeneralSettings = {
  siteName: "GensanWorks",
  siteDescription: "Official Job Assistance Platform of PESO - General Santos City",
  // No placeholder phone/email: contact lines render only when the settings API supplies them.
  contactEmail: "",
  contactPhone: "",
  address: "General Santos City, South Cotabato",
};

export function Footer({ generalSettings = defaultSettings }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-slate-200 bg-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* PESO Information */}
          <div>
            <Link href="/" className="mb-5 flex items-center gap-3">
              <Image 
                src="/peso-gsc-logo.png" 
                alt=""
                width={40}
                height={40}
                className="h-10 w-auto object-contain"
              />
              <span className="font-bold text-xl tracking-tight">
                <span className="text-red-600">Gensan</span>
                <span className="text-blue-600">Works</span>
              </span>
            </Link>
            <p className="text-sm text-slate-600 mb-3 leading-relaxed">
              <span className="font-semibold block mb-0.5">City Government of General Santos</span>
              Public Employment Service Office
            </p>
            <Link href="/help" className="text-sm text-blue-600 hover:underline font-medium">
              Help & accessibility
            </Link>
          </div>

          {/* Contact us */}
          <div>
            <h2 className="font-bold text-slate-900 mb-5 text-sm">Contact Us</h2>
            <ul className="space-y-2.5 text-sm">
              <li className="text-slate-700">{generalSettings.address}</li>
              <li>
                <Link href="/contact" className="text-blue-600 hover:underline font-medium">
                  PESO Helpdesk
                </Link>
              </li>
              {generalSettings.contactPhone ? (
                <li>
                  <a
                    href={`tel:${generalSettings.contactPhone}`}
                    className="text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    <Phone className="mr-2 inline h-4 w-4" aria-hidden="true" />
                    {generalSettings.contactPhone}
                  </a>
                </li>
              ) : null}
              {generalSettings.contactEmail ? (
                <li>
                  <a
                    href={`mailto:${generalSettings.contactEmail}`}
                    className="text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    <Mail className="mr-2 inline h-4 w-4" aria-hidden="true" />
                    {generalSettings.contactEmail}
                  </a>
                </li>
              ) : null}
            </ul>

            {/* Social Links */}
            <h3 className="font-bold text-slate-900 mt-6 mb-3 text-sm">Follow Us</h3>
            <div className="flex gap-2.5">
              {/* Facebook */}
              <a
                href="https://www.facebook.com/PESO.GeneralSantos"
                target="_blank"
                rel="noopener noreferrer"
                className="group w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
                aria-label="Facebook (opens in new tab)"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-blue-600 group-hover:text-white"
                  aria-hidden="true"
                >
                  <path d="M22.675 0h-21.35C.597 0 0 .597 0 1.326v21.348C0 23.403.597 24 1.326 24h11.495v-9.294H9.691v-3.622h3.13V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.796.716-1.796 1.767v2.317h3.59l-.467 3.622h-3.123V24h6.125C23.403 24 24 23.403 24 22.674V1.326C24 .597 23.403 0 22.675 0z" />
                </svg>
              </a>

              {/* X (Twitter) */}
              <a
                href="https://x.com/pesogensan"
                target="_blank"
                rel="noopener noreferrer"
                className="group w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center hover:bg-black transition-colors"
                aria-label="X (opens in new tab)"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-black group-hover:text-white"
                  aria-hidden="true"
                >
                  <path d="M18.902 1H22L13.5 11.004 22.5 23h-7.1l-5.5-7.2-6.1 7.2H2l8.9-10.5L1.5 1h7.2l5 6.6L18.902 1z" />
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/company/pesogensan"
                target="_blank"
                rel="noopener noreferrer"
                className="group w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
                aria-label="LinkedIn (opens in new tab)"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-blue-700 group-hover:text-white"
                  aria-hidden="true"
                >
                  <path d="M4.983 3.5C4.983 5 3.88 6 2.5 6S0 5 0 3.5 1.103 1 2.483 1s2.5 1 2.5 2.5zM.5 8h4V23h-4V8zm7.5 0h3.834v2.05h.054c.534-1.012 1.84-2.05 3.787-2.05 4.05 0 4.8 2.664 4.8 6.128V23h-4v-6.52c0-1.556-.028-3.556-2.17-3.556-2.17 0-2.5 1.693-2.5 3.444V23h-3.8V8z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h2 className="font-bold text-slate-900 mb-5 text-sm">Quick Links</h2>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/about" className="text-slate-600 hover:text-blue-600 transition-colors">
                  About PESO
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-slate-600 hover:text-blue-600 transition-colors">
                  Help & Support
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-slate-600 hover:text-blue-600 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-slate-600 hover:text-blue-600 transition-colors">
                  Contact Information
                </Link>
              </li>
              <li>
                <Link href="/login/admin" className="text-slate-600 hover:text-blue-600 transition-colors">
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h2 className="font-bold text-slate-900 mb-5 text-sm">Resources</h2>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="https://dole.gov.ph"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-600 hover:text-blue-600 transition-colors"
                >
                  Department of Labor (DOLE)
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
              </li>
              <li>
                <a
                  href="https://philjobnet.gov.ph/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-600 hover:text-blue-600 transition-colors"
                >
                  PhilJobNet
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
              </li>
              <li>
                <a
                  href="https://psa.gov.ph"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-600 hover:text-blue-600 transition-colors"
                >
                  Philippine Statistics Authority
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center text-xs text-slate-600">
          <div className="mb-3 md:mb-0">
            <span>© {currentYear} City Government of General Santos. All rights reserved.</span>
          </div>
          <div>
            <span>Discover more on </span>
            <a
              href="https://gensantos.gov.ph/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              gensantos.gov.ph
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}