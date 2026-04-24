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
    <section className="w-full bg-slate-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.4em] uppercase text-blue-600 mb-3">
            Real Results
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            Success Stories
          </h2>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Real people, real results. See how GensanWorks has transformed careers and businesses.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {displayTestimonials.slice(0, 3).map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-white rounded-xl p-7 border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all duration-300"
            >
              {/* Star Rating */}
              <div className="flex items-center gap-0.5 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className="w-4 h-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="text-slate-700 mb-6 text-sm leading-relaxed">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                <div className="w-11 h-11 bg-blue-600 rounded-full flex items-center justify-center font-semibold text-white text-sm">
                  {getInitials(testimonial.name)}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm flex items-center gap-1">
                    {testimonial.name}
                    {testimonial.isVerified && (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    )}
                  </p>
                  <p className="text-xs text-slate-600">
                    {testimonial.role}
                    {testimonial.company && ` at ${testimonial.company}`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}