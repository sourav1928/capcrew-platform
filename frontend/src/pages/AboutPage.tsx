import { usePageMeta } from '../utils/usePageMeta'
import React from 'react';
import { Star, Truck, Shield, Clock } from 'lucide-react';

const AboutPage: React.FC = () => {
  usePageMeta("About Us", "CapCrew makes comfortable, well-finished solid caps and smiley caps for kids and adults.")
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About CapCrew</h1>
          <p className="text-xl text-blue-100">Everyday Caps in Solid Colours and Smiley Designs</p>
        </div>
      </div>

      {/* About Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-700 mb-4">
              We make caps that are comfortable, well finished and easy to wear every day. From clean solid colours to
              cheerful smiley designs, our goal is a cap you will actually reach for.
            </p>
            <p className="text-gray-700">
              Every cap is checked before it ships, and if the fit or colour is not right, returns are simple.
            </p>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Vision</h2>
            <p className="text-gray-700 mb-4">
              To be the first place people think of for fun, affordable headwear, for kids, teens and adults.
            </p>
            <p className="text-gray-700">
              We keep our range focused and our quality consistent, so you always know what you are getting.
            </p>
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Why Choose CapCrew</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Star, title: 'Quality Checked', desc: 'Stitching, shape and colour inspected' },
              { icon: Truck, title: 'Fast Delivery', desc: 'Pan-India delivery in 2-3 days' },
              { icon: Shield, title: 'Secure Shopping', desc: '100% secure payment & data protection' },
              { icon: Clock, title: 'Friendly Support', desc: 'Help with sizing and orders' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <item.icon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Our Promise */}
        <div className="bg-blue-50 rounded-lg p-8 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Our Promise</h2>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-4xl font-bold text-blue-600 mb-2">7 days</div>
              <p className="text-gray-600">Easy returns on unused caps</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-4xl font-bold text-blue-600 mb-2">100%</div>
              <p className="text-gray-600">Quality checked before dispatch</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-4xl font-bold text-blue-600 mb-2">Pan-India</div>
              <p className="text-gray-600">Delivery to your doorstep</p>
            </div>
          </div>
        </div>

        {/* Our Story */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
          <div className="space-y-4 text-gray-700">
            <p>
              CapCrew started with a simple idea: a good cap should be comfortable, look great and not cost a fortune.
              We began with solid-colour classics and added smiley designs after customers kept asking for something
              more playful.
            </p>
            <p>
              Today we offer caps for kids and adults in a focused range, so every piece gets the attention it deserves.
            </p>
          </div>
        </div>

        {/* Team Stats */}
        <div className="grid md:grid-cols-4 gap-8 text-center mb-16">
          {[
            { number: '50K+', label: 'Happy Customers' },
            { number: '10K+', label: 'Products' },
            { number: '500+', label: 'Suppliers' },
            { number: '24/7', label: 'Support' },
          ].map((stat, i) => (
            <div key={i}>
              <div className="text-4xl font-bold text-blue-600 mb-2">{stat.number}</div>
              <p className="text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact CTA */}
      <div className="bg-blue-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Get in Touch</h2>
          <p className="text-lg mb-8">Have questions? We'd love to hear from you</p>
          <a href="/contact" className="inline-block px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100">
            Contact Us
          </a>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
