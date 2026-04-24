"use client";

import React from "react";
import Link from "next/link";

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
  contactEmail: "admin@gensanworks.com",
  contactPhone: "+63 283 889 5200",
  address: "General Santos City, South Cotabato",
};

export function Footer({ generalSettings = defaultSettings }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-slate-50 border-t border-slate-200 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* PESO Information */}
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">G</span>
              </div>
              <span className="font-bold text-lg">{generalSettings.siteName}</span>
            </div>
            <p className="text-sm text-slate-600 mb-3 leading-relaxed">
              <span className="font-semibold block mb-0.5">City Government of General Santos</span>
              Public Employment Service Office
            </p>
            <Link href="/help" className="text-sm text-blue-600 hover:underline font-medium">
              Accessibility Statement
            </Link>
          </div>

          {/* Contact us */}
          <div>
            <h3 className="font-bold text-slate-900 mb-5 text-sm">Contact Us</h3>
            <ul className="space-y-2.5 text-sm">
              <li className="text-slate-700">{generalSettings.address}</li>
              <li>
                <Link href="/contact" className="text-blue-600 hover:underline font-medium">
                  PESO Helpdesk
                </Link>
              </li>
              <li>
                <a
                  href={`tel:${generalSettings.contactPhone}`}
                  className="text-slate-600 hover:text-blue-600 transition-colors"
                >
                  📞 {generalSettings.contactPhone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${generalSettings.contactEmail}`}
                  className="text-slate-600 hover:text-blue-600 transition-colors"
                >
                  ✉️ {generalSettings.contactEmail}
                </a>
              </li>
            </ul>

            {/* Social Links */}
            <h4 className="font-bold text-slate-900 mt-6 mb-3 text-sm">Follow Us</h4>
            <div className="flex gap-2.5">
              {/* Facebook */}
              <a
                href="https://www.facebook.com/PESO.GeneralSantos"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
                aria-label="Facebook"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-blue-600 hover:text-white"
                >
                  <path d="M22.675 0h-21.35C.597 0 0 .597 0 1.326v21.348C0 23.403.597 24 1.326 24h11.495v-9.294H9.691v-3.622h3.13V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.796.716-1.796 1.767v2.317h3.59l-.467 3.622h-3.123V24h6.125C23.403 24 24 23.403 24 22.674V1.326C24 .597 23.403 0 22.675 0z" />
                </svg>
              </a>

              {/* X (Twitter) */}
              <a
                href="https://x.com/pesogensan"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center hover:bg-black transition-colors"
                aria-label="X"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-black hover:text-white"
                >
                  <path d="M18.902 1H22L13.5 11.004 22.5 23h-7.1l-5.5-7.2-6.1 7.2H2l8.9-10.5L1.5 1h7.2l5 6.6L18.902 1z" />
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/company/pesogensan"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
                aria-label="LinkedIn"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-blue-700 hover:text-white"
                >
                  <path d="M4.983 3.5C4.983 5 3.88 6 2.5 6S0 5 0 3.5 1.103 1 2.483 1s2.5 1 2.5 2.5zM.5 8h4V23h-4V8zm7.5 0h3.834v2.05h.054c.534-1.012 1.84-2.05 3.787-2.05 4.05 0 4.8 2.664 4.8 6.128V23h-4v-6.52c0-1.556-.028-3.556-2.17-3.556-2.17 0-2.5 1.693-2.5 3.444V23h-3.8V8z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-slate-900 mb-5 text-sm">Quick Links</h3>
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
                <Link href="/admin/login" className="text-slate-600 hover:text-blue-600 transition-colors">
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-bold text-slate-900 mb-5 text-sm">Resources</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="https://dole.gov.ph"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-600 hover:text-blue-600 transition-colors"
                >
                  Department of Labor (DOLE)
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
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}