"use client";

import React from "react";
import { Star, CheckCircle } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string | null;
  quote: string;
  isVerified: boolean;
}

interface TestimonialsSectionProps {
  testimonials?: Testimonial[];
  loading?: boolean;
}

const defaultTestimonials = [
  {
    id: "1",
    name: "Maria Rodriguez",
    role: "Software Developer",
    company: "TechHub GSC",
    quote: "As a fresh graduate with no work experience, I was worried about finding a job. GensanWorks' career counseling and resume workshop gave me the confidence I needed. I got hired as a junior software developer within 2 weeks!",
    isVerified: true,
  },
  {
    id: "2",
    name: "John Tan",
    role: "HR Manager",
    company: "GenSan Tech Inc.",
    quote: "Our company struggled to find qualified local talent. GensanWorks connected us with amazing candidates—verified, skilled, and ready to work. We've hired 5 employees in just one month and saved thousands on recruitment costs.",
    isVerified: true,
  },
  {
    id: "3",
    name: "Anna Santos",
    role: "Senior Marketing Specialist",
    company: null,
    quote: "After being unemployed for 8 months, I was losing hope. The PESO team through GensanWorks not only helped me update my skills but matched me with a company looking for exactly my expertise. I'm now thriving in my career!",
    isVerified: true,
  },
];

export function TestimonialsSection({
  testimonials = defaultTestimonials,
  loading = false,
}: TestimonialsSectionProps) {
  const displayTestimonials = testimonials.length > 0 ? testimonials : defaultTestimonials;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <section className="w-full bg-white py-32 relative overflow-hidden">
      {/* Decorative Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-600 text-xs font-bold tracking-widest uppercase mb-6 shadow-sm">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              Real Results
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              Success <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Stories</span>
            </h2>
          </div>
          <p className="text-lg text-slate-500 max-w-sm">
            Real people, real results. See how GensanWorks has transformed careers and businesses in General Santos.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-[2rem] p-10 border border-slate-200 animate-pulse h-80" />
            ))
          ) : displayTestimonials.length > 0 ? (
            displayTestimonials.slice(0, 3).map((testimonial, index) => (
              <div
                key={testimonial.id}
                className={`group relative bg-white rounded-[2rem] p-8 md:p-10 border border-slate-200/60 shadow-sm hover:shadow-2xl transition-all duration-500 ${index === 1 ? 'md:-translate-y-6' : 'md:translate-y-6'}`}
              >
                {/* Background gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-orange-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem]" />
                
                <div className="relative z-10">
                  {/* Star Rating */}
                  <div className="flex items-center gap-1 mb-8">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className="w-5 h-5 fill-amber-400 text-amber-400 group-hover:scale-110 transition-transform"
                        style={{ transitionDelay: `${star * 50}ms` }}
                      />
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-slate-700 text-lg leading-relaxed mb-10 font-medium">
                    "{testimonial.quote}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-4 pt-6 border-t border-slate-100">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 p-0.5 rounded-2xl shadow-md group-hover:scale-110 transition-transform duration-300">
                      <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-500 to-orange-600 text-lg">
                        {getInitials(testimonial.name)}
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                        {testimonial.name}
                        {testimonial.isVerified && (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        )}
                      </p>
                      <p className="text-sm text-slate-500 font-medium">
                        {testimonial.role}
                        {testimonial.company && <span className="text-slate-400"> at {testimonial.company}</span>}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <p className="text-slate-400 text-lg font-medium">No testimonials available yet.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}