import Link from "next/link";
import { Mail, MapPin, Phone, Clock, Globe, Send } from "lucide-react";

export const metadata = {
  title: "Contact Us | PESO General Santos",
  description: "Get in touch with the Public Employment Service Office (PESO) of General Santos City.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      {/* Header Section */}
      <section className="bg-blue-700 text-white py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent opacity-50"></div>
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <span className="inline-flex rounded-full bg-blue-600/50 px-3 py-1 text-sm font-semibold tracking-wide text-blue-100 ring-1 ring-inset ring-blue-500/30 mb-6">
            Helpdesk & Support
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl mb-6">
            Get in Touch
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Have questions or need assistance? Our team at the Public Employment Service Office (PESO) is here to help you navigate your employment journey.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8 -mt-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Contact Info Cards */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 flex items-start space-x-4 transition-all hover:shadow-lg hover:border-blue-300">
              <div className="bg-blue-100 text-blue-600 rounded-lg p-3 shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Office Location</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  City Government of General Santos<br />
                  Public Employment Service Office (PESO)<br />
                  4th Flr. GSC Investment Action Center Building,<br />
                  City Hall Compound, GSC
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 flex items-start space-x-4 transition-all hover:shadow-lg hover:border-emerald-300">
              <div className="bg-emerald-100 text-emerald-600 rounded-lg p-3 shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Service Hours</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Monday–Friday<br />
                  8:00 AM–5:00 PM<br />
                  <span className="italic text-slate-500 font-medium">(Excluding public holidays)</span>
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 flex items-start space-x-4 transition-all hover:shadow-lg hover:border-purple-300">
              <div className="bg-purple-100 text-purple-600 rounded-lg p-3 shrink-0">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Connect With Us</h3>
                <div className="space-y-3">
                  <a href="mailto:peso_gensan@yahoo.com" className="flex items-center text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
                    <Mail className="w-4 h-4 mr-3 shrink-0 text-slate-400" />
                    peso_gensan@yahoo.com
                  </a>
                  <a href="tel:+63835533479" className="flex items-center text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
                    <Phone className="w-4 h-4 mr-3 shrink-0 text-slate-400" />
                    (083) 553 3479
                  </a>
                  <a href="https://www.facebook.com/PESO.GeneralSantos" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
                    <Globe className="w-4 h-4 mr-3 shrink-0 text-slate-400" />
                    PESO General Santos
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Access Box from original page */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-lg border border-slate-700 p-6 text-white">
              <h2 className="text-lg font-bold">Need quick access?</h2>
              <p className="mt-2 text-sm text-slate-300 font-medium">Use the role-specific sign-up or login pages below.</p>
              <div className="mt-6 flex flex-col gap-3">
                <Link href="/login" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 text-center transition-colors">
                  Login to Account
                </Link>
                <Link href="/signup/employer" className="rounded-lg border border-slate-600 bg-transparent px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 text-center transition-colors">
                  Employer Sign Up
                </Link>
              </div>
            </div>
          </div>

          {/* Contact Form & Messaging */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-md border border-slate-200 p-8 md:p-10">
            <div className="mb-8 border-b border-slate-100 pb-8">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Send us a Message</h2>
              <p className="text-slate-600 mt-3 text-lg">
                Fill out the form below and our helpdesk team will get back to you as soon as possible.
              </p>
            </div>
            
            <form className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="first-name" className="block text-sm font-bold text-slate-700">First name</label>
                  <div className="mt-2">
                    <input type="text" name="first-name" id="first-name" className="block w-full rounded-lg border-0 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-4 py-3 bg-slate-50" placeholder="Juan" />
                  </div>
                </div>
                <div>
                  <label htmlFor="last-name" className="block text-sm font-bold text-slate-700">Last name</label>
                  <div className="mt-2">
                    <input type="text" name="last-name" id="last-name" className="block w-full rounded-lg border-0 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-4 py-3 bg-slate-50" placeholder="Dela Cruz" />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-bold text-slate-700">Email address</label>
                <div className="mt-2">
                  <input type="email" name="email" id="email" className="block w-full rounded-lg border-0 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-4 py-3 bg-slate-50" placeholder="juan@example.com" />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-bold text-slate-700">Subject</label>
                <div className="mt-2">
                  <select id="subject" name="subject" className="block w-full rounded-lg border-0 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-4 py-3 bg-slate-50 text-slate-900">
                    <option>General Inquiry</option>
                    <option>Job Seeker Assistance</option>
                    <option>Employer Onboarding</option>
                    <option>Technical Support</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-bold text-slate-700">Message</label>
                <div className="mt-2">
                  <textarea id="message" name="message" rows={5} className="block w-full rounded-lg border-0 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-4 py-3 bg-slate-50" placeholder="How can we help you?"></textarea>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button type="button" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all w-full sm:w-auto">
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </button>
              </div>
            </form>
          </div>

        </div>
      </section>
    </main>
  );
}
